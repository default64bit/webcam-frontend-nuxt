// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    css: ["~/assets/css/styles.css"],
    build: {
        postcss: {
            postcssOptions: {
                plugins: {
                    tailwindcss: {},
                    autoprefixer: {},
                },
            },
        },

        transpile: [],
    },

    vite: {},

    modules: [
        // tailwind moudle for nuxt 3
        "@nuxtjs/tailwindcss",
        // websocket wrapper module
        // "~/modules/ws",
    ],
});
