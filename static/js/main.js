function main() {
	var container = document.createElement('div'),
		stats = new Stats(),
		game;

	document.body.appendChild(container);

	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';

	container.appendChild(stats.domElement);

	game = new SpaceMantis(container, stats);
}

