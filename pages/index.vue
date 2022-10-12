<style scoped></style>

<template>
    <div class="flex flex-col gap-6 w-full max-w-md p-8">
        <nuxt-link class="flex justify-center w-full p-2 font-bold rounded-full bg-slate-500" to="/record">Start New Recording</nuxt-link>
        <form class="flex items-center justify-center gap-2" @submit.prevent="">
            <input
                class="w-full flex-grow rounded-full p-2 px-2 outline-none border-0"
                type="text"
                name="recording-code"
                v-model="recordingCode"
                placeholder="Recording Code"
            />
            <a :href="`preview/${recordingCode}`" class="flex justify-center flex-shrink-0 w-max p-2 px-4 font-bold rounded-full bg-slate-500">Preview</a>
        </form>
    </div>
</template>

<script setup>
useHead({ title: `Home` });
definePageMeta({ layout: "web" });

let recordingCode = ref("");
</script>
