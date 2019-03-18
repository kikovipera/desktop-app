<template>
  <main class="chat container">
    <header v-show="conversation">
      <Avatar :conversation="conversation" @onAvatarClick="showDetails"/>
      <div class="title" @click="showDetails">
        <div class="username">{{name}}</div>
        <div class="identity number">{{identity}}</div>
      </div>
      <Dropdown :menus="menus" @onItemClick="onItemClick"></Dropdown>
    </header>
    <ul class="messages" v-chat-scroll v-show="conversation" ref="messagesUl">
      <MessageItem
        v-for="(item, i) in messages"
        v-bind:key="item.id"
        v-bind:message="item"
        v-bind:prev="messages[i-1]"
        v-bind:unread="unreadMessageId"
        v-bind:conversation="conversation"
        v-bind:me="me"
        v-bind:images="images"
      />
    </ul>
    <div v-show="conversation" class="action">
      <div v-if="!participant" class="removed">{{$t('home.removed')}}</div>
      <div v-if="participant" class="input">
        <div class="editable">
          <div
            class="box"
            contenteditable="true"
            :placeholder="$t('home.input')"
            @keydown.enter="sendMessage"
            ref="box"
          ></div>
        </div>
        <font-awesome-icon :icon="['far', 'paper-plane']" class="send" @click="sendMessage"/>
      </div>
    </div>
    <div class="empty" v-if="!conversation">
      <span>
        <img src="../assets/empty.png">
        <label id="title">{{$t('chat.keep_title')}}</label>
        <label>{{$t('chat.keep_des')}}</label>
      </span>
    </div>
    <transition name="slide-right">
      <Details class="overlay" v-if="details" @close="hideDetails"></Details>
    </transition>
  </main>
</template>

<script>
import { mapGetters } from 'vuex'
import { ConversationCategory, ConversationStatus, MessageStatus } from '@/utils/constants.js'
import Dropdown from '@/components/menu/Dropdown.vue'
import Avatar from '@/components/Avatar.vue'
import Details from '@/components/Details.vue'
import MessageItem from '@/components/MessageItem.vue'
import conversationDao from '@/dao/conversation_dao'
import messageDao from '@/dao/message_dao.js'
export default {
  name: 'ChatContainer',
  data() {
    return {
      name: '',
      identity: '',
      participant: true,
      menus: [],
      details: false,
      unreadMessageId: '',
      MessageStatus: MessageStatus,
      images: [],
      inputFlag: false
    }
  },
  watch: {
    conversation: function(newC, oldC) {
      if (!!newC && (!oldC || newC.conversationId !== oldC.conversationId)) {
        let unread = conversationDao.indexUnread(newC.conversationId)
        if (unread > 0) {
          this.unreadMessageId = this.messages[this.messages.length - unread].messageId
        } else {
          this.unreadMessageId = ''
        }
        this.$store.dispatch('markRead', newC.conversationId)
      }
      if (newC) {
        this.images = messageDao.findImages(newC.conversationId)
        if (newC !== oldC) {
          if (newC.groupName) {
            this.name = newC.groupName
          } else if (newC.name) {
            this.name = newC.name
          }
          if (!oldC || newC.conversationId !== oldC.conversationId) {
            this.details = false
          }
        }
        const chatMenu = this.$t('menu.chat')
        var menu = []
        if (newC.category === ConversationCategory.CONTACT) {
          menu.push(chatMenu[0])
          menu.push(chatMenu[2])
          this.identity = newC.ownerIdentityNumber
          this.participant = true
        } else {
          if (newC.status !== ConversationStatus.QUIT) {
            menu.push(chatMenu[1])
          }
          menu.push(chatMenu[2])
          this.identity = this.$t('chat.title_participants', { '0': newC.participants.length })
          this.participant = newC.participants.some(item => {
            return item.user_id === this.me.user_id
          })
        }
        this.menus = menu
      }
    }
  },
  updated() {
    let scrollHeight = this.$refs.messagesUl.scrollHeight
    this.$refs.messagesUl.scrollTop = scrollHeight
  },
  components: {
    Dropdown,
    Avatar,
    Details,
    MessageItem
  },
  computed: {
    ...mapGetters({
      messages: 'getMessages',
      conversation: 'currentConversation',
      user: 'currentUser',
      me: 'me'
    })
  },
  mounted() {
    var self = this
    this.$refs.box.addEventListener('compositionstart', function() {
      self.inputFlag = true
    })
    this.$refs.box.addEventListener('compositionend', function() {
      self.inputFlag = false
    })
  },
  methods: {
    showDetails() {
      this.details = true
    },
    hideDetails() {
      this.details = false
    },
    onItemClick(index) {
      const chatMenu = this.$t('menu.chat')
      const option = this.menus[index]
      const key = parseInt(Object.keys(chatMenu).find(key => chatMenu[key] === option))
      if (key === 0) {
        this.details = true
      } else if (key === 1) {
        this.$store.dispatch('exitGroup', this.conversation.conversationId)
      } else if (key === 2) {
        this.$Dialog.alert(
          this.$t('chat.chat_clear'),
          this.$t('ok'),
          () => {
            this.$store.dispatch('conversationClear', this.conversation.conversationId)
          },
          this.$t('cancel'),
          () => {
            console.log('cancel')
          }
        )
      }
    },
    sendMessage(event) {
      if (this.inputFlag === true || event.shiftKey) {
        return
      }
      const text = this.$refs.box.innerText
      if (text.trim().length <= 0) {
        event.stopPropagation()
        event.preventDefault()
        return
      }
      this.$refs.box.innerText = ''
      event.stopPropagation()
      event.preventDefault()
      const category = this.user.app_id ? 'PLAIN_TEXT' : 'SIGNAL_TEXT'
      const status = MessageStatus.SENDING
      const message = {
        conversationId: this.conversation.conversationId,
        content: text.trim(),
        category: category,
        status: status
      }
      this.$store.dispatch('sendMessage', message)
    }
  }
}
</script>

<style lang="scss" scoped>
.chat.container {
  background: white url('../assets/overlay.png') no-repeat center;
  background-size: cover;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;

  header {
    background: white;
    border-bottom: 1px solid #d7d0cb;
    padding: 0rem 1rem;
    display: flex;
    height: 3.6rem;
    align-items: center;
    background: #ededed;
    .title {
      box-sizing: border-box;
      flex: 1;
      z-index: 1;
      text-align: left;
      padding-left: 0.8rem;
    }
    .username {
      width: 12rem;
      max-width: 100%;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .identity.number {
      font-size: 0.75rem;
      color: $light-font-color;
      margin: 0.1rem 0 0;
    }
  }

  .messages {
    flex: 1;
    height: 100%;
    overflow-x: hidden;
    padding: 0.8rem;
    box-sizing: border-box;
  }

  .action {
    font-size: 1.2rem;
    background: white;
    .removed {
      padding: 0.9rem 0.9rem;
      font-size: 0.95rem;
      text-align: center;
    }
    .input {
      box-sizing: border-box;
      color: $light-font-color;
      display: flex;
      align-items: center;
      padding: 0.4rem 0.6rem;
    }
    .editable {
      max-height: 150px;
      overflow-y: auto;
      flex-grow: 1;
      .box {
        padding: 0.45rem 0.6rem;
        font-size: 1rem;
        min-height: 1.4rem;
        color: black;
        border: none;
        outline: none;
      }
      .box[placeholder]:empty:before {
        content: attr(placeholder);
        color: #555;
      }

      .box[placeholder]:empty:focus:before {
        content: '';
      }
    }
    .bot {
      padding: 0 1rem 0 0;
    }
    .send {
      padding: 0 0.6rem;
    }
  }
  .empty {
    width: 100%;
    height: 100%;
    background: #f8f9fb;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    span {
      display: flex;
      flex-direction: column;
      align-items: center;
      label {
        max-width: 30rem;
        text-align: center;
        margin-top: 2rem;
        color: #93a0a7;
      }
      #title {
        font-size: 30px;
        color: #505d64;
        font-weight: 300;
      }
      img {
        width: 16rem;
        height: 16rem;
      }
    }
  }

  .overlay {
    position: absolute;
    left: 16rem;
    right: 0;
    height: 100%;
    border-left: 1px solid $border-color;
    z-index: 10;
  }

  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.3s;
  }
  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(100%);
  }
}
</style>