<template>
  <li class="user_item_layout" @click="$emit('user-click',user)">
    <Avatar class="user_item_avatar" :user="user"/>
    <p class="user_name">
      {{user.full_name}}
      <ICRobot v-if="user.app_id"/>
    </p>
  </li>
</template>
<script>
import Avatar from '@/components/Avatar.vue'
import ICRobot from '../assets/images/ic_robot.svg'
export default {
  components: {
    Avatar,
    ICRobot
  },
  name: 'UserItem',
  props: ['user'],
  data: function() {
    return {}
  }
}
</script>
<style lang="scss" scoped>
.user_item_layout {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.8rem 0.8rem;
  &:hover,
  &.current {
    background: #f1f2f2;
  }
  border: none;
  border-bottom: 1px solid #f2f2f2;

  background: white;

  .user_item_avatar {
    width: 48px;
    height: 48px;
    margin-right: 16px;
  }
  .user_name {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
