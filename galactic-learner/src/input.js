const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "KeyF",
  "KeyP",
]);

export class Input {
  constructor() {
    this.keys = new Set();
    this.pausedPressed = false;

    window.addEventListener("keydown", (event) => {
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (event.code === "KeyP" && !this.keys.has("KeyP")) {
        this.pausedPressed = true;
      }
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      this.keys.delete(event.code);
    });
  }

  getPlayerAction(playerIndex) {
    if (playerIndex === 1) {
      return {
        moveX: Number(this.keys.has("ArrowRight")) - Number(this.keys.has("ArrowLeft")),
        moveY: Number(this.keys.has("ArrowDown")) - Number(this.keys.has("ArrowUp")),
        fire: this.keys.has("Space"),
      };
    }

    return {
      moveX: Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA")),
      moveY: Number(this.keys.has("KeyS")) - Number(this.keys.has("KeyW")),
      fire: this.keys.has("KeyF"),
    };
  }

  consumePausePress() {
    const value = this.pausedPressed;
    this.pausedPressed = false;
    return value;
  }
}
