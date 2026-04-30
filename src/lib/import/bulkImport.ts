import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

export async function importFromCSV(fileContent: string) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const materials = await processImportData(results.data);
          resolve(materials);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => reject(error),
    });
  });
}

export async function importFromExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return await processImportData(data);
}

async function processImportData(data: any[]) {
  const results = [];
  
  for (const row of data) {
    const name = row.name || row.Name || row.MATERIAL || row.Material;
    const cas = row.cas || row.CAS || row.CAS_NUMBER;
    const description = row.description || row.Description || '';
    
    if (!name) continue;

    // Create material and potentially limits if columns exist (e.g. "Cat 4", "Limit 4")
    const material = await prisma.material.upsert({
      where: { cas: cas ? String(cas) : 'unknown-' + name },
      update: { name, description },
      create: { 
        name, 
        cas: cas ? String(cas) : null, 
        description 
      },
    });

    // Handle potential limit columns (e.g. IFRA_4, IFRA_1, etc)
    const limitEntries = Object.entries(row)
      .filter(([key]) => key.toLowerCase().startsWith('ifra_') || key.toLowerCase().startsWith('cat'))
      .map(([key, value]) => {
        const category = key.replace(/ifra_|cat\s?|_/gi, '').toUpperCase();
        return {
          materialId: material.id,
          category,
          limit: parseFloat(value as string) || null,
        };
      });

    if (limitEntries.length > 0) {
      for (const entry of limitEntries) {
        await prisma.ifraLimit.upsert({
          where: {
            materialId_category: {
              materialId: entry.materialId,
              category: entry.category,
            },
          },
          update: { limit: entry.limit },
          create: {
            materialId: entry.materialId,
            category: entry.category,
            limit: entry.limit,
          },
        });
      }
    }

    results.push(material);
  }

  return results;
}
