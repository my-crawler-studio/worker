export function getRandomProductKeyword() {
  const keywords = [
    "The Legend of Zelda: Tears of the Kingdom",
    "Sony WH-1000XM5",
    // ... (此处保留你所有的关键词列表)
  ];
  return keywords[Math.floor(Math.random() * keywords.length)];
}
