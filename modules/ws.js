import { generateID } from "../helpers/idGenerator";
import { WebSocketServer } from "ws";
const wsServer = new WebSocketServer({ noServer: true, path: "/ws2" });
// TODO : this module wil not run on production runtime... it will only be called on build stage or on dev mode
// make a nest server for handling the webSocket

let upgradeHandled = false;
const socketConnections = {};

wsServer.on("connection", (ws) => {
    const connectionID = generateID(5);
    // let connectionType = "";
    // let viewing = "";

    ws.on("message", async (message) => {
        const msg = JSON.parse(message);
        switch (msg.event) {
            case "requestStreamerID":
                console.log("Streamer Connected:", connectionID);
                socketConnections[connectionID] = { ws, viewers: {} };
                ws.send(JSON.stringify({ event: "streamerID", data: { connectionID } }));
                break;
            case "requestViewerID":
                if (!socketConnections.hasOwnProperty(msg.data.streamerID)) {
                    console.error("invalidStreamerID", msg.data.streamerID);
                    ws.send(JSON.stringify({ event: "invalidStreamerID" }));
                    return;
                }
                console.log("Viewer Connected:", connectionID);
                socketConnections[msg.data.streamerID].viewers[connectionID] = { ws };
                // give the viewer their connectionID
                ws.send(JSON.stringify({ event: "viewerID", data: { connectionID } }));
                // tell the streamer that a viewer joined
                socketConnections[msg.data.streamerID].ws.send(JSON.stringify({ event: "newViewer", data: { viewerID: connectionID } }));
                break;

            case "sendStream":
                // find the new viewer and deliver the streamer offer to them
                if (!socketConnections.hasOwnProperty(connectionID)) return;
                if (!socketConnections[connectionID].viewers.hasOwnProperty(msg.data.viewerID)) return;
                socketConnections[connectionID].viewers[msg.data.viewerID].ws.send(
                    JSON.stringify({ event: "incomingOffer", data: { streamerID: connectionID, offer: msg.data.offer } })
                );
                break;
            case "updateOfferCandidates":
                // find the viewer and send them an ice
                if (!socketConnections.hasOwnProperty(connectionID)) return;
                if (!socketConnections[connectionID].viewers.hasOwnProperty(msg.data.viewerID)) return;
                socketConnections[connectionID].viewers[msg.data.viewerID].ws.send(
                    JSON.stringify({ event: "iceAnswerCandidate", data: { streamerID: connectionID, offerCandidates: msg.data.offerCandidates } })
                );
                break;
            case "receiveStream":
                // find the streamer and deliver the viewer answer to them
                if (!socketConnections.hasOwnProperty(msg.data.streamerID)) return;
                if (!socketConnections[msg.data.streamerID].viewers.hasOwnProperty(connectionID)) return;
                socketConnections[msg.data.streamerID].ws.send(
                    JSON.stringify({ event: "incomingAnswer", data: { viewerID: connectionID, answer: msg.data.answer } })
                );
                break;
            case "updateAnswerCandidates":
                // find the streamer and send them an ice
                if (!socketConnections.hasOwnProperty(msg.data.streamerID)) return;
                if (!socketConnections[msg.data.streamerID].viewers.hasOwnProperty(connectionID)) return;
                socketConnections[msg.data.streamerID].ws.send(
                    JSON.stringify({ event: "iceOfferCandidate", data: { viewerID: connectionID, answerCandidates: msg.data.answerCandidates } })
                );
                break;
        }
    });

    ws.on("close", () => {
        if (!!socketConnections.hasOwnProperty(connectionID)) {
            delete socketConnections[connectionID];
            console.log("Disconnected:", connectionID);
        } else {
            // TODO
            // connection might be a viewer... we can remove it from the streamer and infom the streamer
            // streamerID must be stored in viewing variable
        }
    });
});

console.log("module called");
export default (_, nuxt) => {
    nuxt.hook("listen", (server) => {
        console.log("listen called");
        server.on("upgrade", (request, socket, head) => {
            console.log("upgrade called");
            wsServer.handleUpgrade(request, socket, head, (ws) => {
                wsServer.emit("connection", ws);
            });
        });
        nuxt.hook("close", () => wsServer.close());
    });
};
