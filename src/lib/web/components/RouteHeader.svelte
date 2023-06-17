<script lang="ts">
  export let breadcrumbs: { label: string; href: string }[];
</script>

<header class="bg-body-secondary py-4">
  <div class="container">
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        {#each breadcrumbs as breadcrumb, i}
          {#if i < breadcrumbs.length - 1}
            <li class="breadcrumb-item">
              <a href={breadcrumb.href}>{breadcrumb.label}</a>
            </li>
          {:else}
            <li class="breadcrumb-item active" aria-current="page">
              {breadcrumb.label}
            </li>
          {/if}
        {/each}
      </ol>
    </nav>
    <div class="py-2">
      <slot/>
    </div>
  </div>
</header>
