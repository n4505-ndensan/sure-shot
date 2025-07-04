const port = Number(process.env.SERVER_PORT) || 8000;

export async function fetchSelf(
  path?: string,
  init?: RequestInit
): Promise<Response> {
  const selfHost = window.location.hostname;
  return fetch(
    `http://${selfHost}:${port}${
      path ? (path.startsWith("/") ? path : `/${path}`) : ""
    }`,
    init
  );
}
