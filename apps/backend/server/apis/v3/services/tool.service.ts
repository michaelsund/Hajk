import log4js from "log4js";
import prisma from "../../../common/prisma.ts";

const logger = log4js.getLogger("service.v3.tool");

class ToolService {
  constructor() {
    logger.debug("Initiating Tool Service");
  }

  async getTools() {
    return await prisma.tool.findMany();
  }

  async isToolTypeValid(toolType: string) {
    return await prisma.tool.findFirstOrThrow({ where: { type: toolType } });
  }

  async getMapsWithTool(toolName: string) {
    const maps = await prisma.map.findMany({
      select: { name: true, id: true },
      where: {
        tools: {
          some: {
            tool: {
              type: toolName,
            },
          },
        },
      },
    });

    return maps;
  }
}

export default new ToolService();
