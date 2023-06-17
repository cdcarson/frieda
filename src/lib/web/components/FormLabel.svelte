<script lang="ts">
  export let forId: string;
</script>

<label class="form-label" for={forId}>
  <slot />
</label>
