function bytesParaBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ParaBytes(valor: string): Uint8Array<ArrayBuffer> {
  const bruto = Uint8Array.from(atob(valor), (c) => c.charCodeAt(0));
  const copia = new Uint8Array(bruto.length);
  copia.set(bruto);
  return copia;
}

function comoArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function derivarChave(senha: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(senha),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: comoArrayBuffer(salt), iterations: 100_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function cifrarJson(senha: string, dados: unknown): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chave = await derivarChave(senha, salt);
  const claro = new TextEncoder().encode(JSON.stringify(dados));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, claro));
  return JSON.stringify({
    salt: bytesParaBase64(salt),
    iv: bytesParaBase64(iv),
    data: bytesParaBase64(cifrado),
  });
}

export async function decifrarJson<T>(senha: string, empacotado: string): Promise<T> {
  const { salt, iv, data } = JSON.parse(empacotado) as { salt: string; iv: string; data: string };
  const chave = await derivarChave(senha, base64ParaBytes(salt));
  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ParaBytes(iv) },
    chave,
    base64ParaBytes(data),
  );
  return JSON.parse(new TextDecoder().decode(claro)) as T;
}
