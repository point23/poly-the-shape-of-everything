export enum Direction {
  RIGHT,
  LEFT,
  FORWARD,
  BACKWORD,
  UP,
  DOWN,
}

export enum Entity_Type {
  STATIC,
  DYNAMIC,
  CHARACTER,
  AVATAR,
}

export enum Polyomino_Type {
  /* Monomino:
     _ _ _
    |     |
    |  o  |
    |_ _ _|
   */
  MONOMINO,
  /* Domino:
     _ _ _ _ _ _
    |     |     |
    |  o  |     |
    |_ _ _|_ _ _|
   */
  DOMINO,
  /* Straight-Tromino:
     _ _ _ _ _ _ _ _ _
    |     |     |     |
    |     |  o  |     |
    |_ _ _|_ _ _|_ _ _|
   */
  STRAIGHT_TROMINO,
  /* L-Tromino:
     _ _ _
    |     |
    |     |
    |_ _ _|_ _ _
    |     |     |
    |  o  |     |
    |_ _ _|_ _ _|
   */
  L_TROMINO,
}