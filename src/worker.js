import crypto from 'node:crypto';

const sklandHeaders = {
	'Content-Type': 'application/json',
	'User-Agent': 'Skland/1.5.1 (com.hypergryph.skland; build: 100501001; Android 31; ) Okhttp/4.11.0',
	'Accept-Encoding': 'gzip',
	Connection: 'close',
};

async function sendTgMessage(message, bot_token, chat_id) {
	return await fetch('https://api.telegram.org/bot' + bot_token + '/sendMessage', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: chat_id,
			text: message,
		}),
	});
}

async function get_oauth2_code(token) {
	const url = 'https://as.hypergryph.com/user/oauth2/v2/grant';
	const data = {
		token: token,
		appCode: '4ca99fa6b56cc2ba',
		type: 0,
	};

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			...sklandHeaders,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	}).then((response) => response.json());

	if (response.status != 0) throw new Error('Get oauth2 code error: ' + JSON.stringify(response, null, 2));

	//console.log('Get oauth2 code:\n', JSON.stringify(response, null, 2));
	return response.data;
}

async function get_cred_and_sktoken(code) {
	const url = 'https://zonai.skland.com/api/v1/user/auth/generate_cred_by_code';
	const data = {
		kind: 1,
		code: code,
	};

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			...sklandHeaders,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	}).then((response) => response.json());

	if (response.code != 0) throw new Error('Get cred and sktoken error: ' + JSON.stringify(response, null, 2));

	//console.log('Get cred and sktoken:\n', JSON.stringify(response, null, 2));
	return response.data;
}

function genSign(url, data, sktoken) {
	const signHeaders = {
		platform: '1',
		timestamp: Math.floor(Date.now() / 1000).toString(),
		dId: 'de9759a5afaa634f',
		vName: '1.5.1',
	};

	const { pathname, searchParams } = new URL(url);
	const str =
		pathname +
		(!!searchParams ? searchParams.toString() : '') +
		(!!data ? JSON.stringify(data) : '') +
		signHeaders.timestamp +
		JSON.stringify(signHeaders);

	const hmacSha256 = crypto.createHmac('sha256', sktoken).update(str, 'utf-8').digest('hex');
	const md5 = crypto.createHash('md5').update(hmacSha256).digest('hex');
	return { sign: md5, signHeaders: signHeaders };
}

function genSignedHeader(url, data, cred, sktoken) {
	const { sign, signHeaders } = genSign(url, data, sktoken);
	return new Headers({
		...sklandHeaders,
		...signHeaders,
		sign: sign,
		cred: cred,
	});
}

async function getPlayerBinding(cred, sktoken) {
	const url = 'https://zonai.skland.com/api/v1/game/player/binding';
	const signedHeader = genSignedHeader(url, null, cred, sktoken);
	const playerBinding = await fetch(url, {
		method: 'GET',
		headers: signedHeader,
	}).then((response) => response.json());
	console.log('Get player bindings:\n', JSON.stringify(playerBinding, null, 2));
	if (playerBinding.code != 0) {
		throw new Error('Get player bindings error');
	}
	return playerBinding;
}

async function attandance(data, cred, sktoken) {
	const url = 'https://zonai.skland.com/api/v1/game/attendance';
	const signedHeader = genSignedHeader(url, { uid: data.uid, gameId: data.channelMasterId }, cred, sktoken);
	const attandanceRespose = await fetch(url, {
		method: 'POST',
		headers: signedHeader,
		body: JSON.stringify({ uid: data.uid, gameId: data.channelMasterId }),
	}).then((response) => response.json());
	console.log('Attendance data:\n', JSON.stringify(attandanceRespose, null, 2), JSON.stringify(data, null, 2));

	let result = '';
	if (attandanceRespose.code === 10001) {
		result = 'Attendance repeat:\n' + `${data.nickName} (${data.channelName})\n` + attandanceRespose.message;
	} else if (attandanceRespose.code === 0)
		result =
			'Attendance success:\n' +
			`${data.nickName} (${data.channelName})\n` +
			attandanceRespose.data.awards.map((award) => award.resource.name + ' * ' + award.count).join('\n');
	else {
		result = 'Attendance error:\n' + attandanceRespose;
		throw new Error(result);
	}

	return result;
}

async function main(event, env, ctx) {
	// Get cred and skland token
	const { code } = await get_oauth2_code(env.TOKEN);
	const { cred, token: sktoken } = await get_cred_and_sktoken(code);

	// Get player binding
	const playerBinding = await getPlayerBinding(cred, sktoken);

	// Get all attandance info
	const attandanceData = playerBinding.data.list.flatMap((app) => app.bindingList);

	// Attandance
	for (const data of attandanceData) {
		const result = await attandance(data, cred, sktoken);
		console.log(result);

		// Send message to Telegram
		if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
			console.log(await sendTgMessage(result, env.TG_BOT_TOKEN, env.TG_CHAT_ID));
		}
	}
}

export default {
	async scheduled(event, env, ctx) {
		try {
			// Wait random time
			await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 * 60 * 5));

			await main(event, env, ctx);
		} catch (e) {
			sendTgMessage(e.message, env.TG_BOT_TOKEN, env.TG_CHAT_ID);
		}
	},
	async fetch(event, env, ctx) {
		try {
			if (new URL(event.url).pathname !== '/trigger') return new Response('', { status: 404 });
			await main(event, env, ctx);
			return new Response('Triggered');
		} catch (e) {
			return new Response(e.message);
		}
	},
};
