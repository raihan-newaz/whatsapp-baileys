'use client';

import React, { useState } from 'react';
import { 
  Plus, Search, RefreshCcw, 
  Filter, Ticket, Clock, 
  MessageSquare, XCircle, Inbox,
  X, Paperclip, Send, ChevronDown
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'awaiting_reply', label: 'Awaiting Reply' },
  { value: 'in_progress', label: 'In Progress' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', icon: <div className="w-2 h-2 rounded-full bg-[#3498db]" /> },
  { value: 'medium', label: 'Medium', icon: <div className="w-2 h-2 rounded-full bg-[#e67e22]" /> },
  { value: 'high', label: 'High', icon: <div className="w-2 h-2 rounded-full bg-[#e74c3c]" /> },
  { value: 'critical', label: 'Critical', icon: <div className="w-2 h-2 rounded-full bg-[#9b59b6]" /> }
];

const DEPARTMENTS = [
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' }
];

function NewTicketModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [department, setDepartment] = useState('support');
  const [priority, setPriority] = useState('low');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-[1px]">
      <div 
        className="relative grid w-full max-w-lg gap-4 border border-border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200 sm:rounded-lg"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header Section */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">Create Support Ticket</h2>
          <p className="text-sm text-muted-foreground">
            Describe your issue and our team will get back to you as soon as possible.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 py-2">
          {/* Row 1: Dept & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground">Department</label>
              <CustomSelect
                value={department}
                onChange={setDepartment}
                options={DEPARTMENTS}
                triggerClassName="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground">Priority</label>
              <CustomSelect
                value={priority}
                onChange={setPriority}
                options={PRIORITY_OPTIONS}
                triggerClassName="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              />
            </div>
          </div>

          {/* Row 2: Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground">Subject</label>
            <input 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              placeholder="Brief description of your issue"
              autoComplete="off"
            />
          </div>

          {/* Row 3: Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground">Message</label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none"
              placeholder="Describe your issue in detail..."
              rows={6}
            />
          </div>

          {/* Row 4: Attachments */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground">Attachments</label>
            <div className="flex items-center gap-2">
              <button 
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 gap-2"
                type="button"
              >
                <Paperclip className="w-4 h-4" />
                Add Files
              </button>
              <span className="text-xs text-muted-foreground">Max 5 files, 10MB each</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
          <button 
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 outline-none"
          >
            Cancel
          </button>
          <button 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all h-10 px-4 py-2 gap-2 outline-none"
          >
            <Send className="w-4 h-4" />
            Submit Ticket
          </button>
        </div>

        {/* Close button icon absolute */}
        <button 
          onClick={onClose}
          type="button" 
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 outline-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const stats = [
    { label: 'Total', value: '0', icon: Ticket, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Open', value: '0', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pending', value: '0', icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Closed', value: '0', icon: XCircle, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
  ];

  return (
    <div className="p-4 md:p-8 pb-24 min-h-screen bg-background space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Manage your support requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            className="btn-icon"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all z-10" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets.."
            className="input-standard pl-11 group-focus-within:ring-primary/20 w-full"
            style={{ 
              height: 'var(--comp-height)', 
              borderRadius: 'var(--comp-radius)'
            }}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            icon={<Filter className="w-4 h-4" />}
            options={STATUS_OPTIONS}
            className="w-full md:w-48"
          />
        </div>
      </div>

      {/* Main Content / Empty State */}
      <div className="bg-card border border-border rounded-[2rem] flex flex-col items-center justify-center py-24 text-center shadow-sm relative overflow-hidden group min-h-[400px]">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
          <Inbox className="w-48 h-48 rotate-12" />
        </div>
        
        <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 border border-primary/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
          <Inbox className="w-10 h-10 text-primary" />
        </div>
        
        <h2 className="text-xl font-bold text-foreground mb-2">No tickets yet</h2>
        <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed font-medium">
          Create your first support ticket to get started.
        </p>
        
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary px-8"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Ticket
        </button>
      </div>

      {/* Footer Branding */}
      <footer className="mt-12 text-center text-[10px] text-muted-foreground font-medium opacity-60">
        ©2026 Wa Cloud · Powered by Globyn · Made in Bangladesh
      </footer>

      <NewTicketModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
