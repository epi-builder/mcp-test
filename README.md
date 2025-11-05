# Playwright MCP Server

Microsoft의 [Playwright MCP](https://github.com/microsoft/playwright-mcp)를 참고하여 구현한 Model Context Protocol (MCP) 서버입니다. `streamableHttp` transport를 사용하여 웹 브라우저 자동화 기능을 제공합니다.

<a href="https://glama.ai/mcp/servers/@epi-builder/mcp-test">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@epi-builder/mcp-test/badge" alt="Playwright Server MCP server" />
</a>

## 기능

이 서버는 다음과 같은 브라우저 자동화 도구들을 제공합니다:

- **browser_navigate**: URL로 이동
- **browser_snapshot**: 현재 페이지의 접근성 스냅샷 캡처
- **browser_click**: 요소 클릭
- **browser_type**: 텍스트 입력
- **browser_take_screenshot**: 스크린샷 촬영
- **browser_close**: 브라우저 종료

## 설치

```bash
npm install
```

## 사용법

### StreamableHttp Transport (권장)

```bash
# 기본 포트 3000으로 실행
npm run dev -- --streamable-http

# 특정 포트로 실행
npm run dev -- --streamable-http --port=8080
```

서버가 시작되면 `http://localhost:3000/mcp` (또는 지정한 포트)에서 MCP 서버에 접근할 수 있습니다.

### Stdio Transport

```bash
npm run dev
```

## 프로그래밍 방식 사용법

```typescript
import { PlaywrightMCPServer } from './src/server.js';

const server = new PlaywrightMCPServer();

// StreamableHttp transport로 시작
await server.start('streamableHttp', 3000);

// 또는 stdio transport로 시작
await server.start('stdio');
```

## MCP 클라이언트 연결

MCP 클라이언트에서 이 서버에 연결하려면:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["dist/index.js", "--streamable-http", "--port=3000"],
      "env": {}
    }
  }
}
```

## 개발

```bash
# TypeScript 컴파일
npm run build

# 개발 모드 실행
npm run dev

# 프로덕션 빌드 후 실행
npm run build
npm start
```

## 라이선스

MIT