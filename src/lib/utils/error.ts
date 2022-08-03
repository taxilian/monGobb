export interface NodeErrorConstructor {
  new(message?: string): NodeJS.ErrnoException;
  (message?: string): NodeJS.ErrnoException;
  readonly prototype: NodeJS.ErrnoException;
}
export const NodeError: NodeErrorConstructor = Error;
