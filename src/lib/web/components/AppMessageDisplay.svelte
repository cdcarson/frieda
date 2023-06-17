<script lang="ts">
  import { getAppMessage, type AppMessage } from '../stores.js';
  import { onMount } from 'svelte';
  import type { Unsubscriber } from 'svelte/store';
  const svc = getAppMessage();
  let message: null | AppMessage = null;
  let unsub: Unsubscriber | undefined;
  let hideTimeout: string | number | NodeJS.Timeout | undefined;
  onMount(() => {
    unsub = svc.message.subscribe((m) => {
      clearTimeout(hideTimeout);
      if (m !== null && m.context === 'success') {
        hideTimeout = setTimeout(() => {
          svc.hide();
        }, 5000);
      }
      message = m;
    });
  });

  const slideUp = (_node: HTMLElement, { duration = 250 }) => {
    return {
      delay: 0,
      duration,
      css: (t: number) => {
        return `transform: translateY(${100 - t * 100}%) translateX(-50%)`;
      }
    };
  };
</script>

{#if message}
  {#if message.context === 'wait'}
    <div class="waitBackdrop" />
  {/if}
  <div
    class="message"
    in:slideUp={{ duration: 200 }}
    out:slideUp={{ duration: 200 }}
    role="alert" 
    aria-live={message.context === 'wait' ? 'assertive' : 'polite'} 
    aria-atomic="true"
  >
    <div class="card">
      <div class="card-body">
        {message.message}
      </div>
    </div>
  </div>
{/if}

<style>
  .waitBackdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 99990;
  }
  .message {
    position: fixed;
    bottom: 0;
    left: 50%;
    z-index: 99991;
    width: 300px;
    padding: 4px 8px;
    transform: translateX(-50%);
  }
</style>
