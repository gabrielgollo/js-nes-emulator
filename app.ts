import fs from "fs";

// Do nothing yet
function Main() {
  const nesFile = fs.readFileSync("./rom/game.nes");
  console.log(typeof nesFile);
  //   console.log(nesFile);
  const typedArray = new Int8Array(nesFile.buffer);
  console.log(typedArray[0].toString(16));

  const imageFile = typedArray.slice(262160);
  //fs.writeFileSync("./testes/teste.tiff", nesFile.slice(262160));
}
Main();
