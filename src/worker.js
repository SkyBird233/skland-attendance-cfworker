export default {
	async scheduled(event, env, ctx) {
		async function sendTgMessage(message) {
			return await fetch('https://api.telegram.org/bot' + env.TG_BOT_TOKEN + '/sendMessage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					chat_id: env.TG_CHAT_ID,
					text: message,
				}),
			});
		}

		// Headers from old Skland Android app
		let sklandHeaders = new Headers({
			'Content-Type': 'application/json',
			'User-Agent': 'Skland/1.0.1 (com.hypergryph.skland; build: 100001014; Android 31; ) Okhttp/4.11.0',
			vCode: '100001014',
			vName: '1.0.1',
			dId: 'de9759a5afaa634f',
			platform: '1',
			Cred: env.CRED,
		});

		// Wait random time
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 * 60 * 5));

		// Get player bindings
		const playerBinding = await fetch('https://zonai.skland.com/api/v1/game/player/binding', {
			method: 'GET',
			headers: sklandHeaders,
		}).then((response) => response.json());
		console.log('Get player bindings:\n', JSON.stringify(playerBinding, null, 2));
		if (playerBinding.code != 0) {
			throw new Error('Get player bindings error');
		}

		// Get all attandance info
		let attandanceData = playerBinding.data.list.flatMap((app) => app.bindingList);

		// Attandance
		let result = '';
		for (const data of attandanceData) {
			const attandanceRespose = await fetch('https://zonai.skland.com/api/v1/game/attendance', {
				method: 'POST',
				headers: sklandHeaders,
				body: JSON.stringify({ uid: data.uid, gameId: data.channelMasterId }),
			}).then((response) => response.json());

			console.log('Attendance data:\n', JSON.stringify(attandanceRespose, null, 2), JSON.stringify(data, null, 2));
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
			console.log(result);

			// Send message to Telegram
			if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
				console.log(await sendTgMessage(result));
			}
		}
	},
};
