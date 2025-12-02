import jsPDF from 'jspdf';

export interface ContractData {
  // Contract identification
  contractId: string;
  nftMint: string;
  
  // Creator info
  creatorWallet: string;
  
  // Buyer info
  buyerWallet: string;
  
  // Contract terms
  workName: string;
  platform: string;
  percentage: number;
  durationSeconds: number;
  priceUsdc: number;
  resaleAllowed: boolean;
  
  // Timing
  purchaseDate?: Date;
  startTimestamp?: number;
  
  // Payout info
  totalDeposited?: number;
  totalClaimed?: number;
  availableToClaim?: number;
}

// Calculate contract timing details
export function getContractTiming(data: ContractData) {
  const now = new Date();
  const startDate = data.startTimestamp 
    ? new Date(data.startTimestamp * 1000) 
    : data.purchaseDate || now;
  
  let endDate: Date | null = null;
  let timeRemaining = '';
  let status = 'Active';
  let remainingDays = 0;
  let remainingHours = 0;
  
  if (data.durationSeconds > 0) {
    endDate = new Date(startDate.getTime() + (data.durationSeconds * 1000));
    const remaining = endDate.getTime() - now.getTime();
    
    if (remaining <= 0) {
      status = 'Expired';
      timeRemaining = 'Contract has expired';
    } else {
      remainingDays = Math.floor(remaining / (1000 * 60 * 60 * 24));
      remainingHours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      timeRemaining = `${remainingDays} days, ${remainingHours} hours remaining`;
    }
  } else {
    timeRemaining = 'Perpetual (no expiration)';
  }
  
  const durationMonths = Math.floor(data.durationSeconds / (30 * 24 * 60 * 60));
  const durationDays = Math.floor((data.durationSeconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60));
  
  return {
    startDate,
    endDate,
    timeRemaining,
    status,
    remainingDays,
    remainingHours,
    durationMonths,
    durationDays,
    isPerpetual: data.durationSeconds === 0
  };
}

export function generateContractPDF(data: ContractData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  generateProfessionalContract(doc, data);
  
  // Save the PDF
  const filename = `royalty-agreement-${data.contractId.slice(0, 8)}.pdf`;
  doc.save(filename);
}

function generateProfessionalContract(doc: jsPDF, data: ContractData): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;
  
  const timing = getContractTiming(data);
  const now = new Date();
  
  // Helper functions
  const addCentered = (text: string, y: number, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('times', bold ? 'bold' : 'normal');
    doc.text(text, pageWidth / 2, y, { align: 'center' });
  };
  
  const addParagraph = (text: string, y: number, size = 10) => {
    doc.setFontSize(size);
    doc.setFont('times', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    return y + (lines.length * 5) + 3;
  };
  
  const addSection = (title: string, y: number) => {
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(title, margin, y);
    return y + 8;
  };
  
  const addField = (label: string, value: string, y: number) => {
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text(label, margin, y);
    doc.setFont('times', 'normal');
    const labelWidth = doc.getTextWidth(label) + 3;
    doc.text(value, margin + labelWidth, y);
    return y + 6;
  };
  
  // ===== PAGE 1 =====
  
  // Header with border
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.rect(margin - 5, yPos - 5, contentWidth + 10, 35);
  
  addCentered('DIGITAL ROYALTY RIGHTS AGREEMENT', yPos + 5, 16, true);
  addCentered('Revenue Participation Certificate', yPos + 13, 12);
  addCentered('Executed and Recorded on the Solana Blockchain', yPos + 20, 9);
  
  yPos += 40;
  
  // Contract reference
  doc.setFontSize(9);
  doc.setFont('times', 'italic');
  doc.text(`Agreement Reference: ${data.contractId}`, margin, yPos);
  doc.text(`Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString()}`, margin, yPos + 5);
  yPos += 15;
  
  // Preamble
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  yPos = addSection('RECITALS', yPos);
  
  yPos = addParagraph(
    `WHEREAS, this Digital Royalty Rights Agreement ("Agreement") constitutes a legally binding contract between the parties identified herein, executed through cryptographic signatures on the Solana blockchain network; and`,
    yPos
  );
  
  yPos = addParagraph(
    `WHEREAS, the Creator (as defined below) desires to grant certain revenue participation rights to the Rights Holder (as defined below) in exchange for valuable consideration; and`,
    yPos
  );
  
  yPos = addParagraph(
    `WHEREAS, both parties acknowledge that this Agreement is self-executing through smart contract technology, with all terms and conditions enforced programmatically on-chain;`,
    yPos
  );
  
  yPos = addParagraph(
    `NOW, THEREFORE, in consideration of the mutual covenants and agreements set forth herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:`,
    yPos
  );
  
  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Article 1 - Parties
  yPos = addSection('ARTICLE I: IDENTIFICATION OF PARTIES', yPos);
  
  yPos = addParagraph(
    `1.1 "Creator" shall refer to the party identified by the following Solana blockchain wallet address, who is the original issuer of this royalty agreement and bears the obligation to make revenue payments:`,
    yPos
  );
  
  doc.setFillColor(245, 245, 245);
  doc.rect(margin + 10, yPos - 3, contentWidth - 20, 8, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(data.creatorWallet, margin + 15, yPos + 2);
  yPos += 12;
  
  yPos = addParagraph(
    `1.2 "Rights Holder" shall refer to the party identified by the following Solana blockchain wallet address, who has acquired this royalty certificate and is entitled to receive revenue payments:`,
    yPos
  );
  
  doc.setFillColor(245, 245, 245);
  doc.rect(margin + 10, yPos - 3, contentWidth - 20, 8, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(data.buyerWallet, margin + 15, yPos + 2);
  yPos += 15;
  
  // Article 2 - Subject Matter
  yPos = addSection('ARTICLE II: SUBJECT MATTER AND REVENUE SOURCE', yPos);
  
  yPos = addParagraph(
    `2.1 This Agreement pertains to revenue generated from the following creative work, content, or digital asset (the "Work"):`,
    yPos
  );
  
  doc.setFillColor(240, 240, 240);
  doc.rect(margin + 5, yPos - 3, contentWidth - 10, 16, 'F');
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin + 5, yPos - 3, contentWidth - 10, 16, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(`"${data.workName || 'Unnamed Work'}"`, margin + 10, yPos + 4);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Platform/Distribution Channel: ${data.platform || 'Not specified'}`, margin + 10, yPos + 10);
  yPos += 22;
  
  yPos = addParagraph(
    `2.2 The Creator represents and warrants that they are the rightful owner of, or have the legal authority to grant revenue participation rights in, the Work described above. The Creator further warrants that entering into this Agreement does not violate any existing contractual obligations or applicable laws.`,
    yPos
  );
  
  // Check if we need a new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }
  
  // Article 3 - Terms
  yPos = addSection('ARTICLE III: FINANCIAL TERMS AND CONSIDERATION', yPos);
  
  yPos = addParagraph(
    `3.1 Royalty Percentage. The Creator hereby agrees to pay the Rights Holder a royalty equal to ${data.percentage}% (${data.percentage} percent) of all gross revenue, earnings, income, proceeds, and any other monetary compensation derived from the Work, regardless of the source, form, or method of payment.`,
    yPos
  );
  
  yPos = addParagraph(
    `3.2 Purchase Consideration. The Rights Holder has paid to the Creator the sum of $${data.priceUsdc.toLocaleString()} USDC (United States Dollar Coin) as full consideration for the rights granted under this Agreement. This payment has been recorded and verified on the Solana blockchain.`,
    yPos
  );
  
  yPos = addParagraph(
    `3.3 Payment Method. All royalty payments shall be made in USDC (USD Coin) and deposited directly into the smart contract's payout pool. The Rights Holder may claim accumulated payments at any time through the designated smart contract interface.`,
    yPos
  );
  
  // Article 4 - Duration
  yPos = addSection('ARTICLE IV: TERM AND DURATION', yPos);
  
  if (timing.isPerpetual) {
    yPos = addParagraph(
      `4.1 This Agreement shall remain in full force and effect in PERPETUITY, with no expiration date. The obligations and rights established herein shall continue indefinitely and shall be binding upon the parties and their respective successors, assigns, and legal representatives.`,
      yPos
    );
  } else {
    yPos = addParagraph(
      `4.1 Effective Date. This Agreement became effective on ${timing.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (the "Effective Date"), as recorded on the Solana blockchain.`,
      yPos
    );
    
    yPos = addParagraph(
      `4.2 Expiration Date. This Agreement shall terminate on ${timing.endDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (the "Expiration Date"), representing a total duration of ${timing.durationMonths} months and ${timing.durationDays} days from the Effective Date.`,
      yPos
    );
    
    yPos = addParagraph(
      `4.3 Current Status. As of the generation of this document, the Agreement is ${timing.status.toUpperCase()}. ${timing.status === 'Active' ? `Time remaining until expiration: ${timing.remainingDays} days and ${timing.remainingHours} hours.` : 'The term of this Agreement has concluded.'}`,
      yPos
    );
  }
  
  // Check if we need a new page
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }
  
  // Article 5 - Transferability
  yPos = addSection('ARTICLE V: TRANSFERABILITY AND ASSIGNMENT', yPos);
  
  if (data.resaleAllowed) {
    yPos = addParagraph(
      `5.1 This royalty certificate IS TRANSFERABLE. The Rights Holder may sell, assign, transfer, or otherwise convey their rights under this Agreement to a third party. Upon such transfer, the new holder shall assume all rights and entitlements of the original Rights Holder.`,
      yPos
    );
    
    yPos = addParagraph(
      `5.2 Transfers shall be executed through the designated smart contract interface and recorded on the Solana blockchain. The Creator's obligations shall continue to apply to any subsequent Rights Holder.`,
      yPos
    );
  } else {
    yPos = addParagraph(
      `5.1 This royalty certificate is NON-TRANSFERABLE. The Rights Holder may NOT sell, assign, transfer, or otherwise convey their rights under this Agreement to any third party. Any attempted transfer in violation of this provision shall be null and void.`,
      yPos
    );
  }
  
  // Article 6 - Obligations
  yPos = addSection('ARTICLE VI: CREATOR OBLIGATIONS AND COVENANTS', yPos);
  
  yPos = addParagraph(
    `6.1 Payment Obligation. The Creator covenants and agrees to deposit ${data.percentage}% of all revenue earned from the Work into the smart contract payout pool in a timely manner, and in no event later than thirty (30) days following receipt of such revenue.`,
    yPos
  );
  
  yPos = addParagraph(
    `6.2 Good Faith. The Creator agrees to act in good faith and shall not take any action designed to circumvent, avoid, or diminish the royalty payments owed to the Rights Holder under this Agreement.`,
    yPos
  );
  
  yPos = addParagraph(
    `6.3 Record Keeping. The Creator shall maintain accurate records of all revenue generated from the Work and shall make such records available for inspection upon reasonable request by the Rights Holder.`,
    yPos
  );
  
  // Check if we need a new page for financial summary
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }
  
  // Financial Summary (if applicable)
  if (data.totalDeposited !== undefined) {
    yPos = addSection('ARTICLE VII: FINANCIAL SUMMARY', yPos);
    
    yPos = addParagraph(
      `As of the date of this document, the following financial transactions have been recorded on the blockchain:`,
      yPos
    );
    
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, yPos - 2, contentWidth, 22, 'F');
    doc.setDrawColor(0);
    doc.rect(margin, yPos - 2, contentWidth, 22, 'S');
    
    yPos = addField('Total Royalties Deposited by Creator:', `$${(data.totalDeposited || 0).toFixed(2)} USDC`, yPos + 2);
    yPos = addField('Total Royalties Claimed by Rights Holder:', `$${(data.totalClaimed || 0).toFixed(2)} USDC`, yPos);
    yPos = addField('Available for Immediate Claim:', `$${(data.availableToClaim || 0).toFixed(2)} USDC`, yPos);
    yPos += 8;
  }
  
  // Blockchain Verification
  yPos = addSection('ARTICLE VIII: BLOCKCHAIN VERIFICATION', yPos);
  
  yPos = addParagraph(
    `This Agreement and all associated transactions are recorded on the Solana blockchain and may be independently verified using the following identifiers:`,
    yPos
  );
  
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  yPos = addField('Smart Contract Address:', data.contractId.slice(0, 32) + '...', yPos);
  yPos = addField('NFT Mint Address:', data.nftMint.slice(0, 32) + '...', yPos);
  yPos = addField('Network:', 'Solana (Devnet)', yPos);
  
  yPos += 5;
  
  // Footer
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
  
  doc.setFontSize(8);
  doc.setFont('times', 'italic');
  doc.setTextColor(100);
  doc.text('This document is an official record generated from immutable blockchain data.', margin, pageHeight - 20);
  doc.text('All terms are enforced by the royalties.fun smart contract on Solana.', margin, pageHeight - 16);
  doc.text(`Verify: https://explorer.solana.com/address/${data.contractId}?cluster=devnet`, margin, pageHeight - 12);
  
  // Page number
  doc.setTextColor(0);
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10);
}


