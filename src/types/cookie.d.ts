declare module 'cookie' {
  export interface CookieSerializeOptions {
    domain?: string;
    encode?(val: string): string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    priority?: 'low' | 'medium' | 'high';
    sameSite?: true | false | 'lax' | 'strict' | 'none';
    secure?: boolean;
    partitioned?: boolean;
  }

  export interface CookieParseOptions {
    decode?(val: string): string;
  }

  export function serialize(
    name: string,
    val: string,
    options?: CookieSerializeOptions
  ): string;

  export function parse(
    str: string,
    options?: CookieParseOptions
  ): Record<string, string>;
}
