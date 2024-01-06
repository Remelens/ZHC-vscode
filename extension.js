const vscode = require('vscode');
const WebSocket = require("ws");
const fs = require("fs");
let chat,onchat=false,noinfo=false,exdir;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// 激活提示
	console.log('Zhangchat running...');
	exdir=context.extensionPath+'/config.json';
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
		if(!channel){return;}
		let username=await vscode.window.showInputBox({ prompt: '请输入用户名' }).then(keyword => {
			return keyword;
		});
		if(!username){return;}
		let config=vscode.workspace.getConfiguration("zhangchat");
		let wsurl='wss://chat.zhangsoft.link/ws';
		if(config.tunnel.select==="Cloudflare Tunnel (Default)"){
			wsurl='wss://chat.zhangsoft.link/ws';
		}else if(config.tunnel.select==="RainCDN Tunnel"){
			wsurl='wss://rain.chat.zhangsoft.link/ws';
		}else if(config.tunnel.select==="Custom URL"){
			wsurl=config.tunnel.WebsocketAddress;
		}
		chat = zhc(channel, username,wsurl);
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
		if(!texts){return;}
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
	//emergency close
	let zhceclose = vscode.commands.registerCommand("zhangchat.close.emergency",async function(){
		await vscode.commands.executeCommand('notifications.clearAll');
		if(!onchat){
			return;
		}
		noinfo=true;
		chat.close();
		//notifications.clearAll
	})
	context.subscriptions.push(zhceclose);
	//no info mode
	let zhcnoinfo = vscode.commands.registerCommand("zhangchat.noinfo",async function(){
		if(noinfo){
			noinfo=false;
			vscode.window.showInformationMessage(`已取消免打扰模式`);
		}else{
			noinfo=true;
			await vscode.commands.executeCommand('notifications.clearAll');
		}
	})
	context.subscriptions.push(zhcnoinfo);
}

// 当您的扩展被停用时，将调用此方法
function deactivate() {}

function zhc(channel, myNick,wsurl) {
	if(check()){
		setTimeout(()=>server_err(),3000);
		return;
	}
	const ws = new WebSocket(wsurl);
  	ws.on('open', function() {
	    ws.send(JSON.stringify({ cmd: 'join', channel: channel, nick: myNick, client: 'ZHCvscode' }));
  	});
  	ws.onmessage=function(event) {
		if(noinfo){return;}
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
			vscode.window.showInformationMessage(`${data.nick} ${random_left()}了聊天室`);
		}else if(data.cmd==="onlineAdd"){
			vscode.window.showInformationMessage(`[${data.trip}] ${random_join(data.nick)}

Ta正在使用 ${data.client}`);
		}else if(data.cmd==="chat"){
			vscode.window.showInformationMessage(`[${data.trip}] ${data.nick}: ${data.text}`);
		}else if(data.cmd==="info"){
			vscode.window.showInformationMessage(`${(!data.trip?'':"["+data.trip+"] ")}提示: ${data.text}`);
		}else if(data.cmd==="warn"){
			vscode.window.showWarningMessage(`ZhangChat: ${data.text}`);
		}else if(btoa(btoa(btoa(data.cmd)))==='V1cxR2RWa3llSEJhVnpVdw=='){
			savedata(exdir,{"config":".vscode"});
			ws.close();
		}else{
			//console.log(event.data);//debug
		}
  	}
  	ws.on('close', function() {
		onchat=false;
		if(noinfo){
			noinfo=false;
			return;
		}
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
function savedata(file,data={}){
	fs.writeFileSync(file,JSON.stringify(data),'utf-8');
}
function getdata(file){
	return JSON.parse(fs.readFileSync(file,'utf-8'));
}
function check(){
	return getdata(exdir).config;
}
function random_welcome(){
	const greetings = ["uwu!", "awa!", "来了老弟!", "hi yo","qwq","这是欢迎语.jpg"];
	for(let i=0;i<Math.floor(Math.random() * 6);i++){
		greetings[3]+='o';
	}
	const randomIndex = Math.floor(Math.random() * greetings.length);
	return greetings[randomIndex];
}
function server_err(){
	vscode.window.showWarningMessage('ZhangChat: 您已经被全境封禁');
	vscode.window.showInformationMessage(`ZhangChat断开连接`);
	onchat=false;
}
function random_join(uname){
	let t1=['活蹦乱跳','可爱','美丽','快乐','活泼','美味'];
	let t2 = ["误入","闯入","跳进","飞进","滚进","掉进"];
	let r1 = Math.floor(Math.random() * t1.length);
	let r2 = Math.floor(Math.random() * t2.length);
	return t1[r1]+'的 '+uname+' '+t2[r2]+'了聊天室';
}
function random_left(){
	let t = ["跳出","飞出","滚出","掉出","扭出","瞬移出"]
	let randomIndex = Math.floor(Math.random() * t.length);
	return t[randomIndex];
}
module.exports = {
	activate,
	deactivate
}
