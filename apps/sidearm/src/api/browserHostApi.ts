import {
  ApiToken,
  AuthStatus,
  getAuthStatus,
  login,
  ServerInfo,
} from "@sureshot/api/src";

/**
 * ブラウザ拡張機能用のホスト検索
 * ローカルネットワークをスキャンしてサーバーを発見
 */
export async function findHostsInBrowser(): Promise<ServerInfo[]> {
  const hosts: ServerInfo[] = [];
  const commonPorts = [8000]; // sure-shotで使用される可能性のあるポート

  try {
    // ローカルIPレンジを取得
    const localIPs = await getLocalNetworkRange();

    // 並行してホストをスキャン
    const scanPromises = localIPs.flatMap((ip) =>
      commonPorts.map((port) => scanHost(ip, port))
    );

    const results = await Promise.allSettled(scanPromises);

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        hosts.push(result.value);
      }
    });

    return hosts;
  } catch (error) {
    console.error("Failed to scan for hosts:", error);
    return [];
  }
}

/**
 * 個別のホストをスキャン
 */
async function scanHost(ip: string, port: number): Promise<ServerInfo | null> {
  try {
    console.log(`Scanning host: ${ip}:${port}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://${ip}:${port}/ping`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const serverInfo = await response.json();
      return {
        ip,
        port,
        status: "online",
        message: "Connected",
        name: serverInfo.name || "Unknown Server",
        is_self: false,
      };
    }
  } catch (error) {
    // ホストが見つからない場合は無視
  }

  return null;
}

/**
 * ローカルネットワークのIPレンジを取得
 */
async function getLocalNetworkRange(): Promise<string[]> {
  const ips: string[] = [];

  try {
    // WebRTC APIを使用してローカルIPを取得
    const localIP = await getLocalIP();
    if (localIP) {
      const ipParts = localIP.split(".");
      if (ipParts.length === 4) {
        const network = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;

        // 同一ネットワークの範囲をスキャン（1-254）
        for (let i = 1; i <= 254; i++) {
          ips.push(`${network}.${i}`);
        }
      }
    }
  } catch (error) {
    console.warn("Could not determine local network range:", error);
  }

  return ips;
}

/**
 * WebRTC APIを使用してローカルIPアドレスを取得
 */
async function getLocalIP(): Promise<string | null> {
  return new Promise((resolve) => {
    const rtc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    rtc.createDataChannel("");

    rtc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate;
        const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (match && match[1]) {
          const ip = match[1];
          // プライベートIPアドレスかチェック
          if (
            ip.startsWith("192.168.") ||
            ip.startsWith("10.") ||
            ip.startsWith("172.")
          ) {
            rtc.close();
            resolve(ip);
            return;
          }
        }
      }
    };

    rtc.createOffer().then((offer) => {
      rtc.setLocalDescription(offer);
    });

    // タイムアウト
    setTimeout(() => {
      rtc.close();
      resolve(null);
    }, 5000);
  });
}

/**
 * サーバーにログインする
 */
export async function loginToServer(host: ServerInfo): Promise<AuthStatus> {
  try {
    const localIp = await getLocalIP();
    if (!localIp) {
      throw new Error("Could not determine local IP address");
    }
    await login({
      deviceId: "test-device",
      host: host,
      selfLocalIp: localIp,
    });
  } catch (error) {
    console.error("Login failed:", error);
  }

  return getAuthStatus();
}

export async function validateToken(token: ApiToken): Promise<boolean> {
  try {
    return true;
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
}
