import { ethers } from 'ethers';
import { FolderInfo } from './types';

export class FoldersService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private folderRegistryService: any;

  constructor(provider: ethers.Provider, signer?: ethers.Signer, folderRegistryService?: any) {
    this.provider = provider;
    this.signer = signer;
    this.folderRegistryService = folderRegistryService;
  }

  async getAllFolders(): Promise<FolderInfo[]> {
    if (!this.folderRegistryService) {
      throw new Error('FolderRegistryService is required for folder operations');
    }
    
    return await this.folderRegistryService.getAllFolders();
  }

  async getFolderById(folderId: number): Promise<FolderInfo | null> {
    if (!this.folderRegistryService) {
      throw new Error('FolderRegistryService is required for folder operations');
    }
    
    return await this.folderRegistryService.getFolder(folderId);
  }

  async getFoldersCount(): Promise<number> {
    if (!this.folderRegistryService) {
      throw new Error('FolderRegistryService is required for folder operations');
    }
    
    return await this.folderRegistryService.getFolderCount();
  }

  async getTokenFolders(): Promise<FolderInfo[]> {
    const allFolders = await this.getAllFolders();
    // Filter folders that have token-related permissions or allocations
    return allFolders.filter(folder => 
      folder.defaultPermissions & (1 << 3) || // Transfer permission
      folder.defaultPermissions & (1 << 0)   // View permission
    );
  }

  async searchFolders(searchTerm: string): Promise<FolderInfo[]> {
    const allFolders = await this.getAllFolders();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return allFolders.filter(folder =>
      folder.name.toLowerCase().includes(lowerSearchTerm) ||
      folder.id.toString().includes(lowerSearchTerm)
    );
  }

  async getActiveFolders(): Promise<FolderInfo[]> {
    const allFolders = await this.getAllFolders();
    // Filter folders that have members (indicating active usage)
    const activeFolders = [];
    
    for (const folder of allFolders) {
      try {
        const members = await this.folderRegistryService.getFolderMembers(folder.id);
        if (members.length > 0) {
          activeFolders.push(folder);
        }
      } catch (error) {
        // Skip folders that can't be checked for members
        continue;
      }
    }
    
    return activeFolders;
  }
}
