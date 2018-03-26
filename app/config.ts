import { IConfig } from './config.d';

class Config implements IConfig {
	port = 80;
	refreshInterval = 500;
	deviceDebounceInterval = 10000;
	
	botToken = 'BOT-TOKEN';
	
	chatId = 'CHAT-ID';
	debugChatId = 'DEBUG-CHAT-ID';
	
	debug = false;
	enableTelegram = true;
}

export const config = new Config();
