export function getRandomProductKeyword() {
  const keywords = [
    // --- Switch Games (English / Japanese) ---
    "The Legend of Zelda: Tears of the Kingdom",
    "ゼルダの伝説 ティアーズ オブ ザ キングダム",
    "Mario Kart 8 Deluxe",
    "マリオカート8 デラックス",
    "Animal Crossing: New Horizons",
    "あつまれ どうぶつの森",
    "Splatoon 3",
    "Ring Fit Adventure",

    // --- PlayStation Games (English / Japanese) ---
    "God of War Ragnarök",
    "Elden Ring",
    "エルデンリング",
    "Final Fantasy XVI",
    "ファイナルファンタジーXVI",
    "Cyberpunk 2077: Phantom Liberty",
    "Resident Evil 4 Remake",
    "BIOHAZARD RE:4", // 日版常见名称

    // --- Electronics (Model Names Only - No suffixes like 'Camera'/'Mouse') ---
    "Sony WH-1000XM5", // 已去掉 Headphones
    "AirPods Pro 2", // 已去掉 Earbuds
    "NVIDIA GeForce RTX 4090", // 已去掉 Graphics Card
    "Logitech MX Master 3S", // 已去掉 Mouse
    "Keychron Q1 Pro", // 已去掉 Keyboard
    "Fujifilm X100VI", // 已去掉 Camera
    "Ricoh GR IIIx",
    "Steam Deck OLED",
    "PlayStation 5 Pro",
  ];
  return keywords[Math.floor(Math.random() * keywords.length)];
}
