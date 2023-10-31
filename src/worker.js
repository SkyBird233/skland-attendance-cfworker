export default {
	async scheduled(event, env, ctx) {
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

		// Get player bindings
		const playerBinding = await fetch('https://zonai.skland.com/api/v1/game/player/binding', {
			method: 'GET',
			headers: sklandHeaders,
		}).then((response) => response.json());
		if (playerBinding.code != 0) {
			console.log('Get player bindings error:', playerBinding);
			return;
		}

		// Get all attandance info
		let attandanceData = [];
		for (const app of playerBinding.data.list) {
			for (const binding of app.bindingList) {
				attandanceData.push({
					uid: binding.uid,
					gameId: binding.channelMasterId,
				});
			}
		}

		// Attandance
		for (const data of attandanceData) {
			const attandanceRespose = await fetch('https://zonai.skland.com/api/v1/game/attendance', {
				method: 'POST',
				headers: sklandHeaders,
				body: JSON.stringify(data),
			}).then((response) => response.json());
			if (attandanceRespose.code != 0) console.log('Attendance error:', attandanceRespose, data);
			else console.log('Attendance success:', attandanceRespose, data);
		}
	},
};
