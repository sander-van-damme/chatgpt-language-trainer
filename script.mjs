import Cookies from 'https://esm.sh/js-cookie@3.0.5';
import { ChatGPTAPI } from 'https://esm.sh/chatgpt@5.2.5';

class Page {
    static apiCookie = 'openAiApiKey';

    // Get Open AI API key from window prompt or cookie.
    static getApiKey() {
        let apiKey = Cookies.get(Page.apiCookie);
        while (!apiKey || apiKey === 'null') {
            apiKey = window.prompt('OpenAI API key:');
            const expiryDate = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365);
            Cookies.set(Page.apiCookie, apiKey, { expires: expiryDate, secure: true, sameSite: 'strict' });
        }
        return apiKey;
    }

    static reset() {
        Cookies.remove(Page.apiCookie);
        location.reload();
    }
}

class Chat {
    constructor() {
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.chatMessages = document.getElementById('chat-messages');
        // Set up callback for user input.
        this.publicCallback = () => { };
        this.privateCallback = () => {
            const message = this.messageInput.value;
            if (message) {
                // Empty chat input box.
                this.messageInput.value = '';
                // Add the message to the chat log.
                this.addMessage(message, 'user');
                // Execute the public callback.
                this.publicCallback(message);
            }
        }
        this.sendButton.addEventListener('click', this.privateCallback);
        this.messageInput.addEventListener('keyup', event => event.key === 'Enter' && this.privateCallback())
    }

    setCallback(callback) {
        this.publicCallback = callback;
    }

    addMessage(messageText, sender) {
        const message = document.createElement('div');
        message.innerHTML = messageText;
        message.classList.add('message');
        message.classList.add(sender);
        this.chatMessages.appendChild(message);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

class Ai {
    constructor(apiKey) {
        const config = { apiKey: apiKey, fetch: self.fetch.bind(self) };
        this.conversationAgent = new ChatGPTAPI(config);
        this.previousConversationId = undefined;
        this.correctionAgent = new ChatGPTAPI(config);
    }

    async getConversation(message) {
        // Pass previous conversation id (if it exists) to ensure conversation continuity.
        const options = this.previousConversationId ? { parentMessageId: this.previousConversationId } : new Object();
        return this.conversationAgent.sendMessage(message, options)
            .then(response => response.text);
    }

    async getCorrection(language, message) {
        const systemMessage = `You will be provided with statements in ${language}, and your task is to correct any language errors in that statement and explain them. If there are no errors you respond with "no errors".`;
        return this.correctionAgent.sendMessage(message, { systemMessage: systemMessage })
            .then(response => response.text)
    }
}

function init() {
    const ai = new Ai(Page.getApiKey());
    const chat = new Chat();
    // Set initial callback for language selection.
    chat.setCallback(async language => {
        const initMessage = ` Please be my ${language} conversation partner. Speak to me only in ${language}. Answer briefly (50 words maximum). Ask me questions.`;
        await ai.getConversation(initMessage).then(response => chat.addMessage(response, 'converser'));
        // Set final callback once language is selected.
        chat.setCallback(async message => {
            await ai.getCorrection(language, message).then(correction => chat.addMessage(correction, 'corrector'));
            const conversationMessage = `Respond to the following in ${language}: ${message}`;
            ai.getConversation(conversationMessage).then(response => chat.addMessage(response, 'converser'));
        })
    })

}

document.addEventListener('DOMContentLoaded', init);
