<style scoped>
a {
    border-bottom: 3px solid transparent;
}
.router-link-exact-active {
    border-bottom: 3px solid #00dc81;
}
</style>

<template>
    <main class="">
        <nav class="flex items-center gap-4 w-full"></nav>
        <slot />
    </main>
</template>

<script setup></script>
