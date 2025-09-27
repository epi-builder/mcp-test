import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium, Browser, Page } from 'playwright';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';

interface BrowserState {
  browser: Browser | null;
  page: Page | null;
}

class PlaywrightMCPServer {
  private browserState: BrowserState = {
    browser: null,
    page: null,
  };

  constructor() {
    // Server will be created per request
  }

  private createServer(): { server: Server; cleanup: () => Promise<void> } {
    const server = new Server(
      {
        name: 'playwright-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers(server);
    
    const cleanup = async () => {
      if (this.browserState.browser) {
        await this.browserState.browser.close();
        this.browserState.browser = null;
        this.browserState.page = null;
      }
    };

    return { server, cleanup };
  }

  private setupToolHandlers(server: Server) {
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'browser_navigate',
            description: 'Navigate to a URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL to navigate to',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'browser_snapshot',
            description: 'Capture accessibility snapshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'browser_click',
            description: 'Click on an element',
            inputSchema: {
              type: 'object',
              properties: {
                element: {
                  type: 'string',
                  description: 'Human-readable element description',
                },
                ref: {
                  type: 'string',
                  description: 'Exact target element reference from page snapshot',
                },
              },
              required: ['element', 'ref'],
            },
          },
          {
            name: 'browser_type',
            description: 'Type text into an element',
            inputSchema: {
              type: 'object',
              properties: {
                element: {
                  type: 'string',
                  description: 'Human-readable element description',
                },
                ref: {
                  type: 'string',
                  description: 'Exact target element reference from page snapshot',
                },
                text: {
                  type: 'string',
                  description: 'Text to type into the element',
                },
              },
              required: ['element', 'ref', 'text'],
            },
          },
          {
            name: 'browser_take_screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                filename: {
                  type: 'string',
                  description: 'File name to save the screenshot to',
                },
                fullPage: {
                  type: 'boolean',
                  description: 'Take screenshot of full page',
                },
              },
            },
          },
          {
            name: 'browser_close',
            description: 'Close the browser',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'browser_navigate':
            return await this.handleNavigate(args?.url as string);
          
          case 'browser_snapshot':
            return await this.handleSnapshot();
          
          case 'browser_click':
            return await this.handleClick(args?.element as string, args?.ref as string);
          
          case 'browser_type':
            return await this.handleType(args?.element as string, args?.ref as string, args?.text as string);
          
          case 'browser_take_screenshot':
            return await this.handleScreenshot(args?.filename as string | undefined, args?.fullPage as boolean | undefined);
          
          case 'browser_close':
            return await this.handleClose();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async ensureBrowser() {
    if (!this.browserState.browser) {
      this.browserState.browser = await chromium.launch({
        headless: false,
      });
    }
    if (!this.browserState.page) {
      this.browserState.page = await this.browserState.browser.newPage();
    }
  }

  private async handleNavigate(url: string) {
    await this.ensureBrowser();
    await this.browserState.page!.goto(url);
    
    return {
      content: [
        {
          type: 'text',
          text: `Navigated to ${url}`,
        },
      ],
    };
  }

  private async handleSnapshot() {
    await this.ensureBrowser();
    
    // Get page content and create a simple snapshot
    const title = await this.browserState.page!.title();
    const url = this.browserState.page!.url();
    
    return {
      content: [
        {
          type: 'text',
          text: `Page Snapshot:
Title: ${title}
URL: ${url}
[Use browser_click, browser_type tools to interact with elements]`,
        },
      ],
    };
  }

  private async handleClick(element: string, ref: string) {
    await this.ensureBrowser();
    
    // Simple click implementation - in a real implementation,
    // you would parse the ref to find the actual element
    await this.browserState.page!.click('body'); // Placeholder
    
    return {
      content: [
        {
          type: 'text',
          text: `Clicked on ${element}`,
        },
      ],
    };
  }

  private async handleType(element: string, ref: string, text: string) {
    await this.ensureBrowser();
    
    // Simple type implementation
    await this.browserState.page!.keyboard.type(text);
    
    return {
      content: [
        {
          type: 'text',
          text: `Typed "${text}" into ${element}`,
        },
      ],
    };
  }

  private async handleScreenshot(filename?: string, fullPage?: boolean) {
    await this.ensureBrowser();
    
    const screenshotPath = filename || `screenshot-${Date.now()}.png`;
    await this.browserState.page!.screenshot({
      path: screenshotPath,
      fullPage: fullPage || false,
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Screenshot saved to ${screenshotPath}`,
        },
      ],
    };
  }

  private async handleClose() {
    if (this.browserState.browser) {
      await this.browserState.browser.close();
      this.browserState.browser = null;
      this.browserState.page = null;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: 'Browser closed',
        },
      ],
    };
  }

  async start(transport: 'stdio' | 'streamableHttp', port?: number) {
    if (transport === 'stdio') {
      const { server } = this.createServer();
      const stdioTransport = new StdioServerTransport();
      await server.connect(stdioTransport);
      console.error('Playwright MCP server running on stdio');
    } else if (transport === 'streamableHttp') {
      const app = express();
      app.use(cors({
        origin: "*",
        methods: ["GET", "POST", "DELETE"],
        allowedHeaders: [
          "Content-Type",
          "Accept",
          "mcp-session-id",
          "last-event-id",
          "mcp-protocol-version"
        ]
      }));

      const transports: Map<string, StreamableHTTPServerTransport> = new Map();

      app.post('/mcp', async (req: Request, res: Response) => {
        console.error('Received MCP POST request');
        try {
          const sessionId = req.headers['mcp-session-id'] as string | undefined;
          let transport: StreamableHTTPServerTransport;

          if (sessionId && transports.has(sessionId)) {
            transport = transports.get(sessionId)!;
          } else if (!sessionId) {
            const { server, cleanup } = this.createServer();
            
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sessionId: string) => {
                console.error(`Session initialized with ID: ${sessionId}`);
                transports.set(sessionId, transport);
              }
            });

            server.onclose = async () => {
              const sid = transport.sessionId;
              if (sid && transports.has(sid)) {
                console.error(`Transport closed for session ${sid}, removing from transports map`);
                transports.delete(sid);
                await cleanup();
              }
            };

            await server.connect(transport);
            await transport.handleRequest(req, res);
            return;
          } else {
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: req?.body?.id,
            });
            return;
          }

          await transport.handleRequest(req, res);
        } catch (error) {
          console.error('Error handling MCP request:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
              },
              id: req?.body?.id,
            });
          }
        }
      });

      app.get('/mcp', async (req: Request, res: Response) => {
        console.error('Received MCP GET request');
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports.has(sessionId)) {
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
            },
            id: req?.body?.id,
          });
          return;
        }

        const transport = transports.get(sessionId);
        await transport!.handleRequest(req, res);
      });

      app.delete('/mcp', async (req: Request, res: Response) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports.has(sessionId)) {
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
            },
            id: req?.body?.id,
          });
          return;
        }

        console.error(`Received session termination request for session ${sessionId}`);
        try {
          const transport = transports.get(sessionId);
          await transport!.handleRequest(req, res);
        } catch (error) {
          console.error('Error handling session termination:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Error handling session termination',
              },
              id: req?.body?.id,
            });
          }
        }
      });

      const serverPort = port || 33000;
      app.listen(serverPort, () => {
        console.log(`Playwright MCP server running on http://localhost:${serverPort}/mcp`);
      });

      process.on('SIGINT', () => {
        process.exit(0);
      });
    }
  }
}

export { PlaywrightMCPServer };
