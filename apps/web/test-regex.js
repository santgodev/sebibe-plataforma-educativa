const url =
  'https://www.youtube.com/watch?v=QhsAiMHVYTI&list=PLZrFrWywdBn2KchZ4aa_lmXo5BF5mpDeo';
const str = url.trim();
const regExp =
  /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
const match = str.match(regExp);
console.log(match);
