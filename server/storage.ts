import { type Protocol, type InsertProtocol } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getProtocol(id: string): Promise<Protocol | undefined>;
  createProtocol(protocol: InsertProtocol): Promise<Protocol>;
  updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined>;
  getAllProtocols(): Promise<Protocol[]>;
}

export class MemStorage implements IStorage {
  private protocols: Map<string, Protocol>;

  constructor() {
    this.protocols = new Map();
  }

  async getProtocol(id: string): Promise<Protocol | undefined> {
    return this.protocols.get(id);
  }

  async createProtocol(insertProtocol: InsertProtocol): Promise<Protocol> {
    const id = randomUUID();
    const protocol: Protocol = { 
      ...insertProtocol, 
      id,
      createdAt: new Date(),
    };
    this.protocols.set(id, protocol);
    return protocol;
  }

  async updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined> {
    const existing = this.protocols.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.protocols.set(id, updated);
    return updated;
  }

  async getAllProtocols(): Promise<Protocol[]> {
    return Array.from(this.protocols.values());
  }
}

export const storage = new MemStorage();
