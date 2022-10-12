module.exports = {
    mode: "jit",
    content: [`components/**/*.{vue,js}`, `layouts/**/*.vue`, `pages/**/*.vue`, `plugins/**/*.{js,ts}`, `app.vue`],
    darkMode: "media", // or 'media' or 'class'
    theme: {
        extend: {
            boxShadow: {
                nr: "0 5px 10px -5px rgba(0, 0, 0, 0.1)",
            },
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
};
