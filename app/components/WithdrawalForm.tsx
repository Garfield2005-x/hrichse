'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Plus, Trash2, User, Briefcase, Landmark, Loader2, FileText, CheckCircle2, Hash, Image as ImageIcon, X, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';

interface WithdrawalItem {
  no: number;
  description: string;
  purpose: string;
  amount: number;
  note: string;
}

type RequestCategory = 'company' | 'executive' | 'office' | 'other';

interface FormState {
  date: string;
  requesterName: string;
  position: string;
  requestCategory: RequestCategory;
  otherDetail: string;
  accountNumber: string;
  bankName: string;
}

interface ImageData {
  url: string;
  width: number;
  height: number;
}

export default function WithdrawalForm() {
  const [form, setForm] = useState<FormState>({
    date: new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }),
    requesterName: '',
    position: '',
    requestCategory: 'other',
    otherDetail: '',
    accountNumber: '',
    bankName: '',
  });

  const [items, setItems] = useState<WithdrawalItem[]>([
    { no: 1, description: '', purpose: '', amount: 0, note: '' },
  ]);

  const [images, setImages] = useState<ImageData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    setTotalAmount(total);
  }, [items]);

  const addItem = () => {
    setItems([
      ...items,
      { no: items.length + 1, description: '', purpose: '', amount: 0, note: '' },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, no: i + 1 }));
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof WithdrawalItem, value: string | number) => {
    setItems(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          const img = new Image();
          img.onload = () => {
            setImages(prev => [...prev, {
                url,
                width: img.naturalWidth || 300,
                height: img.naturalHeight || 300
            }]);
          };
          img.src = url;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/templates/expense_template.docx');
      if (!response.ok) throw new Error('Cannot load original template file');
      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);

      // Image Module Configuration
      const opts = {
        centered: false,
        getImage: (tagValue: string) => {
          const base64 = tagValue.split(',')[1];
          return Buffer.from(base64, 'base64');
        },
        getSize: (img: any, tagValue: string) => {
          const found = images.find(i => i.url === tagValue);
          const w = found?.width || 300;
          const h = found?.height || 300;
          
          const maxWidth = 450;
          const ratio = w / h;
          
          // Preserving aspect ratio while fitting within maxWidth
          if (w > maxWidth) {
              return [maxWidth, Math.round(maxWidth / ratio)];
          }
          return [w, h];
        },
      };
      const imageModule = new ImageModule(opts);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
      });

      doc.render({
        date: form.date,
        employeeName: form.requesterName,
        position: form.position,
        accountNumber: form.accountNumber,
        bankName: form.bankName,
        isCompany: form.requestCategory === 'company' ? '✔' : '',
        isExecutive: form.requestCategory === 'executive' ? '✔' : '',
        isOffice: form.requestCategory === 'office' ? '✔' : '',
        isOther: form.requestCategory === 'other' ? '✔' : '',
        otherDetail: form.otherDetail,
        items: items.map(item => ({
            ...item,
            amount: item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
        })),
        totalAmount: totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        hasImages: images.length > 0,
        images: images.map(img => ({ image: img.url })),
      });

      const blob = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(blob, `Withdrawal_${form.requesterName || 'Request'}.docx`);

    } catch (error: any) {
      console.error(error);
      alert(`ไม่สามารถสร้างไฟล์ได้: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdff] dark:bg-slate-950 p-2 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-4 md:y-6">
        {/* Header Section - More Compact on Mobile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-blue-500/5 border border-white dark:border-slate-800">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-2 md:gap-3">
              <span className="bg-blue-600 text-white p-1.5 md:p-2 rounded-xl md:rounded-2xl"><FileText className="w-5 h-5 md:w-8 md:h-8" /></span>
              WITHDRAWAL <span className="text-blue-600 hidden xs:inline">TEMPLATE</span>
            </h1>
            <p className="flex items-center gap-2 text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em]">
                <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-500" /> Original File Mode Active
            </p>
          </div>
          <Button onClick={handleExportDocx} className="h-12 md:h-16 px-6 md:px-10 rounded-2xl md:rounded-3xl bg-slate-900 hover:bg-black text-white font-black transition-all shadow-xl active:scale-95 disabled:opacity-50 text-sm md:text-base" disabled={isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 md:w-6 md:h-6 mr-2 md:mr-3 animate-spin text-blue-500" /> : <FileText className="w-4 h-4 md:w-6 md:h-6 mr-2 md:mr-3 text-blue-400" />}
              {isExporting ? 'GENERATING...' : 'DOWNLOAD DOCX'}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
          <div className="xl:col-span-8 space-y-4 md:y-6">
            <Card className="p-4 md:p-12 border-none shadow-2xl rounded-[2rem] md:rounded-[3.5rem] bg-white dark:bg-slate-900 h-full">
              <div className="space-y-8 md:space-y-10">
                {/* Section: Requester */}
                <div className="space-y-4 md:space-y-6">
                    <h3 className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-4 md:w-8 h-px bg-blue-500/30" /> ข้อมูลผู้เบิก
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <Input label="ชื่อ-นามสกุล" placeholder="ระบุชื่อผู้เบิก..." value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} icon={<User className="text-blue-500 w-4 h-4" />} />
                        <Input label="ตำแหน่ง" placeholder="ระบุตำแหน่ง..." value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} icon={<Briefcase className="text-blue-500 w-4 h-4" />} />
                    </div>
                </div>

                {/* Section: Request Type */}
                <div className="space-y-4 md:space-y-6">
                    <h3 className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-4 md:w-8 h-px bg-blue-500/30" /> เรื่องที่ขอเบิก
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                        {[
                            { id: 'company', label: 'บริษัท' },
                            { id: 'executive', label: 'ผู้บริหาร' },
                            { id: 'office', label: 'ส่วนกลาง' },
                            { id: 'other', label: 'อื่นๆ' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setForm({ ...form, requestCategory: cat.id as RequestCategory })}
                                className={`h-12 md:h-16 rounded-xl md:rounded-2xl border-2 transition-all font-bold text-xs md:text-sm ${
                                    form.requestCategory === cat.id 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                                    : 'border-slate-100 hover:border-blue-200 text-slate-500 bg-slate-50/50'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section: Items Table / Mobile Cards */}
                <div className="space-y-4 md:space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-4 md:w-8 h-px bg-blue-500/30" /> รายการค่าใช้จ่าย
                        </h3>
                        <button onClick={addItem} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-all active:scale-95">
                            + Add Row
                        </button>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-slate-50/50 rounded-[2.5rem] p-4 border border-slate-100">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead>
                                  <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                                      <th className="px-4 py-4 w-12 text-center">#</th>
                                      <th className="px-4 py-4">รายการ / วัตถุประสงค์</th>
                                      <th className="px-4 py-4 w-32 text-right">จำนวนเงิน</th>
                                      <th className="px-4 py-4 w-12"></th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/50">
                                  {items.map((item, index) => (
                                      <tr key={index} className="group hover:bg-white transition-colors duration-200">
                                          <td className="px-4 py-4 text-slate-300 font-black text-center">{item.no}</td>
                                          <td className="px-4 py-4 space-y-2">
                                              <input className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-800" placeholder="รายการ..." value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                                              <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-slate-400" placeholder="วัตถุประสงค์..." value={item.purpose} onChange={(e) => updateItem(index, 'purpose', e.target.value)} />
                                          </td>
                                          <td className="px-4 py-4">
                                              <div className="flex items-center justify-end font-black text-xl text-blue-600">
                                                  <span className="text-[10px] mr-1 opacity-30 italic">฿</span>
                                                  <input type="number" className="w-24 bg-transparent border-none p-0 focus:ring-0 text-right font-black tabular-nums" value={item.amount || ''} onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} />
                                              </div>
                                          </td>
                                          <td className="px-4 py-4">
                                              <button onClick={() => removeItem(index)} className="text-slate-200 hover:text-red-500 hover:rotate-12 transition-all">
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 space-y-4 relative group">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-300 uppercase">Item #{item.no}</span>
                                    <button onClick={() => removeItem(index)} className="text-slate-300 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">รายการ</label>
                                        <input className="w-full bg-white rounded-xl border border-slate-100 p-3 text-sm font-bold text-slate-800" placeholder="ระบุรายการ..." value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">วัตถุประสงค์</label>
                                            <input className="w-full bg-white rounded-xl border border-slate-100 p-3 text-xs text-slate-500" placeholder="เพื่อ..." value={item.purpose} onChange={(e) => updateItem(index, 'purpose', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 text-right block">จำนวนเงิน</label>
                                            <div className="flex items-center bg-blue-50 rounded-xl border border-blue-100 p-2.5">
                                                <span className="text-[10px] text-blue-400 font-bold mr-1">฿</span>
                                                <input type="number" className="w-full bg-transparent border-none p-0 focus:ring-0 text-right font-black text-blue-600 text-sm" value={item.amount || ''} onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section: Image Upload (New) */}
                    <div className="space-y-4 md:space-y-6 pt-6">
                        <h3 className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-4 md:w-8 h-px bg-blue-500/30" /> แนบสลิป/หลักฐาน
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {images.map((img, index) => (
                                <div key={index} className="aspect-square relative rounded-2xl md:rounded-3xl overflow-hidden border-2 border-slate-100 shadow-md group">
                                    <img src={img.url} alt="Receipt" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                    <button onClick={() => removeImage(index)} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-2xl md:rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 transition-all group"
                            >
                                <Upload className="w-6 h-6 md:w-8 md:h-8 text-slate-300 group-hover:text-blue-500 group-hover:-translate-y-1 transition-transform" />
                                <span className="text-[8px] md:text-[10px] font-black text-slate-400 group-hover:text-blue-600 uppercase">Upload Slip</span>
                            </button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
                    </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar Area - Mobile Friendly Labels */}
          <div className="xl:col-span-4 space-y-4 md:y-6">
            <Card className="p-6 md:p-8 border-none shadow-2xl rounded-[2rem] md:rounded-[3rem] bg-slate-900 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-all duration-700" />
                <div className="relative space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Total Amount</div>
                        <div className="bg-blue-500/20 text-blue-400 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] font-black uppercase">Live Sum</div>
                    </div>
                    <div className="text-4xl md:text-6xl font-black tracking-tighter tabular-nums text-right">
                        <span className="text-xl md:text-2xl opacity-20 mr-1 italic">฿</span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </Card>

            <Card className="p-6 md:p-8 border-none shadow-2xl rounded-[2rem] md:rounded-[3rem] bg-white dark:bg-slate-900 space-y-6 md:space-y-8">
                <h3 className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-4 md:w-8 h-px bg-blue-500/30" /> ข้อมูลธนาคาร
                </h3>
                <div className="space-y-4 md:space-y-6">
                    <Input label="ธนาคาร" placeholder="ระบุธนาคาร..." value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} icon={<Landmark className="text-blue-500 w-4 h-4" />} />
                    <Input label="เลขที่บัญชี" placeholder="ระบุเลขที่บัญชี..." value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} icon={<Hash className="text-blue-500 w-4 h-4" />} />
                </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
