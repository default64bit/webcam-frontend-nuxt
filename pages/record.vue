<style scoped>
video {
    max-width: initial;
    width: 960px;
    height: 540px;
    transform: rotateY("180deg");
}
</style>

<template>
    <div class="flex flex-col gap-6 p-8">
        <div class="flex flex-col gap-6 w-full max-w-3xl">
            <video class="w-auto h-64" ref="video" autoplay muted></video>
            <div class="flex items-center gap-4 w-full">
                <button
                    class="flex items-center justify-center gap-2 w-max p-2 px-4 font-bold rounded-full bg-slate-300 text-zinc-700"
                    @click="!streaming ? startRecord() : stopRecord()"
                >
                    <b class="w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-400" v-show="streaming"></b>
                    <span>{{ !streaming ? "Start Recording" : "Stop" }}</span>
                </button>
                <button class="flex items-center justify-center gap-2 w-max p-2 px-4 rounded-full bg-slate-200 text-zinc-700" @click="toggleVideo()">
                    <small>Toggle Video</small>
                    <b class="w-4 h-4 rounded-full bg-lime-500 shadow-lg shadow-lime-400" v-if="cameraEnabled"></b>
                    <b class="w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-400" v-else></b>
                </button>
                <button class="flex items-center justify-center gap-2 w-max p-2 px-4 rounded-full bg-slate-200 text-zinc-700" @click="toggleAudio()">
                    <small>Toggle Audio</small>
                    <b class="w-4 h-4 rounded-full bg-lime-500 shadow-lg shadow-lime-400" v-if="micEnabled"></b>
                    <b class="w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-400" v-else></b>
                </button>
            </div>
        </div>
        <div class="flex flex-col gap-1">
            <small class="opacity-50">Your Stream ID</small>
            <span class="">{{ streamerID }} <a class="text-xs underline text-blue-300" :href="`/preview/${streamerID}`" target="_blank">Preview</a></span>
        </div>
    </div>
</template>

<script setup>
useHead({ title: `Record` });
definePageMeta({ layout: "web" });
const config = useRuntimeConfig();

const video = ref("");

let wsConnection = null;
let localStream = null;
let streaming = ref(false);
let streamerID = ref("");
let cameraEnabled = ref(true);
let micEnabled = ref(true);
const viewers = {};

let wsUrl = ref("");

onMounted(() => {
    wsUrl.value = config.public.API_BASE_URL.replace("http", "ws");

    wsConnection = new WebSocket(`${wsUrl.value}/ws3`);
    wsConnection.onopen = websocketOnOpen;
    wsConnection.onclose = websocketOnClose;
    wsConnection.onmessage = websocketOnMessage;
});
onBeforeUnmount(() => {
    wsConnection.close();
    for (let id of Object.keys(viewers)) viewers[id].PC.close();
});

const startRecord = async () => {
    if (streaming.value) await stopRecord();
    await navigator.mediaDevices
        .getUserMedia({
            audio: {
                noiseSuppression: true,
            },
            video: {
                width: { min: 640, ideal: 1920, max: 1920 },
                height: { min: 480, ideal: 1080, max: 1080 },
            },
        })
        .then((stream) => {
            localStream = stream;
            video.value.srcObject = localStream;
            streaming.value = true;
        })
        .catch((e) => console.log(e));
    // TODO : send a info to peerConnection to reload their browsers
};
const stopRecord = async () => {
    if (!streaming.value) return;
    streaming.value = false;

    localStream.getTracks().forEach((track) => track.stop());
    video.value.srcObject = null;
    localStream = null;
};
const toggleVideo = () => {
    const videoTrack = localStream.getTracks().find((track) => track.kind === "video");
    videoTrack.enabled = !videoTrack.enabled;
    cameraEnabled.value = videoTrack.enabled;
};
const toggleAudio = () => {
    const audioTrack = localStream.getTracks().find((track) => track.kind === "audio");
    audioTrack.enabled = !audioTrack.enabled;
    micEnabled.value = audioTrack.enabled;
};

// Socket Setup ===============================================================
const websocketOnOpen = () => {
    // request a conncetionID
    wsConnection.send(JSON.stringify({ event: "requestStreamerID", data: {} }));
};
const websocketOnClose = () => {};
const websocketOnMessage = async ({ data }) => {
    const msg = JSON.parse(data);
    switch (msg.event) {
        case "streamerID":
            streamerID.value = msg.data.connectionID;
            break;

        case "newViewer":
            // if not streaming then dont make connections
            if (!streaming.value) return;
            // push viewer in the list
            viewers[msg.data.viewerID] = { PC: createPeerConnection(msg.data.viewerID) };
            // make an offer and send it to new viewer
            await createAndSendOffer(viewers[msg.data.viewerID].PC, msg.data.viewerID);
            break;

        case "incomingAnswer":
            if (viewers[msg.data.viewerID].PC.currentRemoteDescription) return;
            viewers[msg.data.viewerID].PC.setRemoteDescription(new RTCSessionDescription(msg.data.answer));
            break;

        case "iceOfferCandidate":
            await viewers[msg.data.viewerID].PC.addIceCandidate(new RTCIceCandidate(msg.data.answerCandidates)).catch((e) => {});
            break;
    }
};
// Socket Setup ===============================================================

// Peer Setup ===============================================================
const createPeerConnection = (viewerID) => {
    const PC = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
        iceCandidatePoolSize: 10,
    });
    PC.oniceconnectionstatechange = (event) => {
        if (PC.iceConnectionState == "disconnected") PC.close();
    };
    PC.onicecandidate = async (event) => {
        if (!event.candidate) return;
        wsConnection.send(JSON.stringify({ event: "updateOfferCandidates", data: { viewerID, offerCandidates: event.candidate.toJSON() } }));
    };
    return PC;
};
const createAndSendOffer = async (PC, viewerID) => {
    localStream.getTracks().forEach((track) => {
        PC.addTrack(track, localStream);
    });

    const offer = await PC.createOffer();
    await PC.setLocalDescription(offer);
    wsConnection.send(JSON.stringify({ event: "sendStream", data: { streamerID, viewerID, offer } }));

    return offer;
};
// Peer Setup ===============================================================
</script>
