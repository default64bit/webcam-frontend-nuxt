<style scoped>
video {
    max-width: initial;
    width: 960px;
    height: 540px;
    transform: rotateY("180deg");
}
</style>

<template>
    <div class="flex flex-col gap-6 w-full max-w-md p-8">
        <video class="" ref="video" autoplay></video>
        <div class="flex flex-col gap-1">
            <small class="opacity-50">Your Viewer ID</small>
            <span class="">{{ viewerID }} </span>
        </div>
        <span class="text-xs text-red-300" v-if="error">{{ errorMessage }}</span>
    </div>
</template>

<script setup>
useHead({ title: `Preview` });
definePageMeta({ layout: "web" });
const route = useRoute();

const video = ref("");

let PC = null;
let wsConnection = null;
let mediaStream = null;
let streaming = ref(false);
let streamerID = route.params.code;
let viewerID = ref("");

let error = ref(false);
let errorMessage = ref("");

let backendBaseUrl = process.env.API_BASE_URL;
let wsUrl = ref("");

onMounted(() => {
    if (!streamerID || streamerID == "") {
        error.value = true;
        errorMessage.value = "You Didn't Provide The Preview Code";
        return;
    }

    wsUrl.value = backendBaseUrl.replace("http", "ws");

    wsConnection = new WebSocket(`${wsUrl.value}/ws3`);
    wsConnection.onopen = websocketOnOpen;
    wsConnection.onclose = websocketOnClose;
    wsConnection.onmessage = websocketOnMessage;

    connectPeerConnection();

    mediaStream = new MediaStream();
    video.value.srcObject = mediaStream;
});
onBeforeUnmount(() => {
    wsConnection.close();
    PC.close();
});

// Socket Setup ===============================================================
const websocketOnOpen = async () => {
    // request a conncetionID
    await wsConnection.send(JSON.stringify({ event: "requestViewerID", data: { streamerID } }));
};
const websocketOnClose = () => {};
const websocketOnMessage = async ({ data }) => {
    const msg = JSON.parse(data);
    switch (msg.event) {
        case "viewerID":
            viewerID.value = msg.data.connectionID;
            break;

        case "incomingOffer":
            createAndSendAnswer(msg.data.offer);
            break;

        case "iceAnswerCandidate":
            await PC.addIceCandidate(new RTCIceCandidate(msg.data.offerCandidates)).catch((e) => {});
            break;

        case "invalidStreamerID":
            error.value = true;
            errorMessage.value = "Provided Preview Code Invalid!";
            break;
    }
};
// Socket Setup ===============================================================

// Peer Setup ===============================================================
const connectPeerConnection = () => {
    PC = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
        iceCandidatePoolSize: 10,
    });
    PC.oniceconnectionstatechange = (event) => {
        if (PC.iceConnectionState == "disconnected") resetPeerConnection();
    };
    PC.onicecandidate = async (event) => {
        if (!event.candidate) return;
        wsConnection.send(JSON.stringify({ event: "updateAnswerCandidates", data: { streamerID, answerCandidates: event.candidate.toJSON() } }));
    };
    PC.ontrack = (event) => event.streams[0].getTracks().forEach((track) => mediaStream.addTrack(track));
};
const resetPeerConnection = () => {
    PC.close();
    mediaStream = new MediaStream();
    connectPeerConnection();
};
const createAndSendAnswer = async (offer) => {
    await PC.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await PC.createAnswer();
    await PC.setLocalDescription(answer);
    wsConnection.send(JSON.stringify({ event: "receiveStream", data: { viewerID: viewerID.value, streamerID, answer } }));

    return answer;
};
// Peer Setup ===============================================================
</script>
