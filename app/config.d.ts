export interface IConfig {
	port: number;
	refreshInterval: number;
	deviceDebounceInterval: number;
	
	botToken: string;
	
	chatId: string;
	debugChatId: string;
	
	debug: boolean;
	enableTelegram: boolean;
}
