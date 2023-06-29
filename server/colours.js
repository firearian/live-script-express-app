const Please = require("pleasejs");

let colours = [];

const initColours = () => {
  colours = [];
  colours = Please.make_color({ saturation: 0.9, colors_returned: 25 });
};

const getRandomColor = () => {
  if (colours.length < 5) {
    initColours();
  }
  const colour = colours[Math.floor(Math.random() * colours.length)];
  const index = colours.indexOf(colour);
  colours = colours.splice(index, 1);
  return colour;
};

module.exports = { getRandomColor };
