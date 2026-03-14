<template>
  <span :class="['badge', normalized]">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: String,
    default: 'unknown'
  }
});

const normalized = computed(() => {
  const value = props.value.toLowerCase();
  if (value.includes('reg')) return 'registered';
  if (value.includes('off')) return 'offline';
  if (value.includes('unreg')) return 'unregistered';
  return 'unknown';
});

const text = computed(() => props.value || 'unknown');
</script>
