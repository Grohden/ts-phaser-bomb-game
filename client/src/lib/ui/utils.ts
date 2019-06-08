type TStyles<T> = {
  [k in keyof T]: React.CSSProperties
}

export function createStyle<T>(styles: T): TStyles<T> {
  return styles
}