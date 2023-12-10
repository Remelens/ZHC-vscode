// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const WebSocket = require("ws");
let chat,onchat=false;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// 激活提示
	console.log('Zhangchat running...');
	// 命令在package.json里被定义
	// 用registerCommans注册
	// commandId 参数必须与 package.json 中的命令字段匹配
	//join
	let zhcjoin = vscode.commands.registerCommand("zhangchat.join",async function(){
		if(onchat){
			vscode.window.showErrorMessage('您已经加入频道!');
		}
		let channel=await vscode.window.showInputBox({ prompt: '请输入加入频道' }).then(keyword => {
			return keyword;
		});
		let username=await vscode.window.showInputBox({ prompt: '请输入用户名' }).then(keyword => {
			return keyword;
		});
		chat = zhc(channel, username);
		onchat=true;
	})
	context.subscriptions.push(zhcjoin);
	//send
	let zhcsend = vscode.commands.registerCommand("zhangchat.send",async function(){
		if(!onchat){
			vscode.window.showErrorMessage('您未加入频道!');
			await vscode.commands.executeCommand('zhangchat.join');
		}
		let texts=await vscode.window.showInputBox({ prompt: '发送消息：' }).then(keyword => {
			return keyword;
		});
		chat.sendMessage(texts);
	})
	context.subscriptions.push(zhcsend);
	//send
	let zhcwel = vscode.commands.registerCommand("zhangchat.welcome",async function(){
		if(!onchat){
			vscode.window.showErrorMessage('您未加入频道!');
			return;
		}
		chat.sendMessage(random_welcome());
	})
	context.subscriptions.push(zhcwel);
	//close
	let zhcclose = vscode.commands.registerCommand("zhangchat.close",async function(){
		if(!onchat){
			vscode.window.showErrorMessage('您未加入频道!');
			return;
		}
		chat.close();
	})
	context.subscriptions.push(zhcclose);
}

// 当您的扩展被停用时，将调用此方法
function deactivate() {}

function zhc(channel, myNick) {
	const ws = new WebSocket('wss://chat.zhangsoft.link/ws');
  	ws.on('open', function() {
	    ws.send(JSON.stringify({ cmd: 'join', channel: channel, nick: myNick, client: 'ZHCvscode' }));
  	});
  	ws.onmessage=function(event) {
    	var data=JSON.parse(event.data);
		data.trip=(!data.trip?'NULL':data.trip);
		if(data.cmd==="onlineSet"){
			let res='';
			for(let i=0;i<data.nicks.length;i++){
				res+=data.nicks[i];
				if(i!==data.nicks.length-1){
					res+=',';
				}
			}
			vscode.window.showInformationMessage(`在线用户: ${res}`);
		}else if(data.cmd==="onlineRemove"){
			vscode.window.showInformationMessage(`${data.nick} 离开了聊天室`);
		}else if(data.cmd==="onlineAdd"){
			vscode.window.showInformationMessage(`${data.nick}#${data.trip} 加入了聊天室
Ta正在使用 ${data.client}`);
		}else if(data.cmd==="chat"){
			vscode.window.showInformationMessage(`${data.nick}#${data.trip}:${data.text}`);
		}else if(data.cmd==="info"){
			vscode.window.showInformationMessage(`提示${(!data.nick?'':"#"+data.nick)}:${data.text}`);
		}else{
			//console.log(event.data);//debug
		}
  	}
  	ws.on('close', function() {
		onchat=false;
    	vscode.window.showInformationMessage(`ZhangChat断开连接`);
  	});
  	function sendMessage(text) {
    	ws.send(JSON.stringify({ cmd: 'chat', text: text }));
  	}
	function sendInfo(text) {
    	ws.send(JSON.stringify({ cmd: 'emote', text:text }));
  	}
	function send(json) {
    	ws.send(JSON.stringify(json));
  	}
	function close() {
    	ws.close();
  	}
  	return {
    	sendInfo: sendInfo,
    	sendMessage: sendMessage,
		send:send,
		close:close
  	};
}
function random_welcome(){
	const greetings = ["uwu!", "awa!", "来了老弟!", "hi yo","qwq","这是欢迎语.jpg"];
	for(let i=0;i<Math.floor(Math.random() * 6);i++){
		greetings[3]+='o';
	}
	const randomIndex = Math.floor(Math.random() * greetings.length);
	return greetings[randomIndex];
}
module.exports = {
	activate,
	deactivate
}
