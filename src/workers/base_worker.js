import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import userDao from '@/dao/user_dao'
import appDao from '@/dao/app_dao'
import stickerDao from '@/dao/sticker_dao'
import accountApi from '@/api/account'
import conversationApi from '@/api/conversation'
import userApi from '@/api/user'
import { ConversationStatus, ConversationCategory } from '@/utils/constants.js'
import store from '@/store/store'

export default class BaseWorker {
  async syncConversation(data) {
    if (data.conversation_id === JSON.parse(localStorage.getItem('account')).user_id) {
      return
    }
    let conversation = conversationDao.getConversationById(data.conversation_id)
    if (!conversation) {
      conversation = {
        conversation_id: data.conversation_id,
        owner_id: data.user_id,
        category: null,
        name: null,
        icon_url: null,
        announcement: '',
        code_url: '',
        pay_type: '',
        created_at: new Date().toISOString(),
        pin_time: null,
        last_message_id: null,
        last_read_message_id: null,
        unseen_message_count: 0,
        status: ConversationStatus.START,
        draft: null,
        mute_until: null
      }
      conversationDao.insertConversation(conversation)
      await this.refreshConversation(data.conversation_id)
    }
    if (conversation.status === ConversationStatus.START) {
      await this.refreshConversation(data.conversation_id)
    }
  }

  async refreshConversation(conversationId) {
    const c = await conversationApi.getConversation(conversationId)
    if (c.data.data) {
      const conversation = c.data.data
      const me = JSON.parse(localStorage.getItem('account'))
      const result = conversation.participants.some(function(item) {
        return item.user_id === me.user_id
      })

      const status = result ? ConversationStatus.SUCCESS : ConversationStatus.QUIT
      let ownerId = conversation.creator_id
      if (conversation.category === ConversationCategory.CONTACT) {
        conversation.participants.forEach(function(item) {
          if (item.user_id !== me.user_id) {
            ownerId = item.user_id
          }
        })
      }
      conversationDao.updateConversation({
        conversation_id: conversation.conversation_id,
        owner_id: ownerId,
        category: conversation.category,
        name: conversation.name,
        announcement: conversation.announcement,
        created_at: conversation.created_at,
        status: status,
        mute_until: conversation.mute_until
      })
      await this.refreshParticipants(conversation.conversation_id, conversation.participants)
      await this.syncUser(ownerId)
    }
  }
  async refreshParticipants(conversationId, participants) {
    const local = participantDao.getParticipants(conversationId)
    const localIds = local.map(function(item) {
      return item.user_id
    })
    var online = []
    participants.forEach(function(item, index) {
      online[index] = {
        conversation_id: conversationId,
        user_id: item.user_id,
        role: item.role,
        created_at: item.created_at
      }
    })

    const add = online.filter(function(item) {
      return !localIds.some(function(e) {
        return item.user_id === e
      })
    })
    const remove = localIds.filter(function(item) {
      return !online.some(function(e) {
        return item === e.user_id
      })
    })
    if (add.length > 0) {
      participantDao.insertAll(add)
      const needFetchUsers = add.map(function(item) {
        return item.user_id
      })
      this.fetchUsers(needFetchUsers)
    }
    if (remove.length > 0) {
      participantDao.deleteAll(conversationId, remove)
    }

    if (add.length > 0 || remove.length > 0) {
      store.dispatch('refreshParticipants', conversationId)
    }
  }

  async fetchUsers(users) {
    const resp = await userApi.getUsers(users)
    if (resp.data.data) {
      userDao.insertUsers(resp.data.data)
    }
  }

  async syncUser(userId) {
    let user = userDao.findUserById(userId)
    if (!user) {
      const response = await userApi.getUserById(userId)
      if (response.data.data) {
        user = response.data.data
        userDao.insertUser(user)
        appDao.insert(user.app)
      }
    }
    return user
  }

  async refreshSticker(stickerId) {
    const response = await accountApi.getStickerById(stickerId)
    if (response.data.data) {
      stickerDao.insertUpdate(response.data.data)
    }
  }
}
