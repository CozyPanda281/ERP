import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, BookOpen, Undo2 } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function Badge({ children, tone = 'indigo' }: { children: React.ReactNode; tone?: 'indigo' | 'green' | 'slate' | 'red' | 'amber' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className={`my-8 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl bg-white p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

interface Book {
  id: string
  title: string
  author: string | null
  isbn: string | null
  publisher: string | null
  edition: string | null
  category: string | null
  language: string | null
  totalCopies: number | null
  availableCopies: number | null
  shelfLocation: string | null
  status: string | null
}

interface LibraryMember {
  id: string
  memberId: string
  memberType: string
  membershipDate: string | null
  expiryDate: string | null
  status: string | null
}

interface Issue {
  id: string
  memberId: string
  bookId: string
  issueDate: string | null
  dueDate: string | null
  returnDate: string | null
  status: string | null
  fineAmount: string | null
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
}

interface Student {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string | null
}

const EMPTY_BOOK = {
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  edition: '',
  category: '',
  language: 'English',
  totalCopies: '1',
  availableCopies: '1',
  shelfLocation: '',
}

const EMPTY_MEMBER = {
  memberType: 'student',
  memberId: '',
  membershipDate: '',
  expiryDate: '',
}

const EMPTY_ISSUE = {
  memberId: '',
  bookId: '',
  issueDate: '',
  dueDate: '',
}

export default function Library() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'books' | 'members' | 'issues'>('books')
  const [search, setSearch] = useState('')
  const [bookOpen, setBookOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [bookForm, setBookForm] = useState({ ...EMPTY_BOOK })
  const [memberForm, setMemberForm] = useState({ ...EMPTY_MEMBER })
  const [issueForm, setIssueForm] = useState({ ...EMPTY_ISSUE })
  const [saving, setSaving] = useState(false)

  const booksQuery = useQuery({
    queryKey: ['books', branchId, search],
    queryFn: () =>
      api.get('/library/books', {
        params: { page: 1, limit: 100, ...(search ? { search } : {}) },
      }),
  })
  const books = (booksQuery.data?.data?.data ?? []) as Book[]

  const membersQuery = useQuery({
    queryKey: ['library-members', branchId],
    queryFn: () => api.get('/library/members', { params: { page: 1, limit: 100 } }),
  })
  const members = (membersQuery.data?.data?.data ?? []) as LibraryMember[]

  const issuesQuery = useQuery({
    queryKey: ['library-issues', branchId],
    queryFn: () => api.get('/library/issues', { params: { page: 1, limit: 100 } }),
  })
  const issues = (issuesQuery.data?.data?.data ?? []) as Issue[]

  const studentsQuery = useQuery({
    queryKey: ['students', branchId],
    queryFn: () => api.get('/students', { params: { page: 1, limit: 200 } }),
  })
  const students = (studentsQuery.data?.data?.data ?? []) as Student[]

  const staffQuery = useQuery({
    queryKey: ['staff', branchId],
    queryFn: () => api.get('/staff', { params: { page: 1, limit: 200 } }),
  })
  const staff = (staffQuery.data?.data?.data ?? []) as StaffMember[]

  const bookName = (id: string) => books.find((b) => b.id === id)?.title ?? id.slice(0, 8)

  const memberName = (id: string) => {
    const s = students.find((st) => st.id === id)
    if (s) return `${s.firstName} ${s.lastName}`
    const stf = staff.find((x) => x.id === id)
    if (stf) return `${stf.firstName} ${stf.lastName}`
    return id.slice(0, 8)
  }

  const createBook = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/library/books', {
          ...bookForm,
          totalCopies: Number(bookForm.totalCopies),
          availableCopies: Number(bookForm.availableCopies),
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setBookOpen(false)
      setBookForm({ ...EMPTY_BOOK })
      setInfo('Book added')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteBook = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/library/books/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setInfo('Book removed')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createMember = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/library/members', {
          memberId: memberForm.memberId,
          memberType: memberForm.memberType,
          membershipDate: memberForm.membershipDate,
          expiryDate: memberForm.expiryDate || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-members'] })
      setMemberOpen(false)
      setMemberForm({ ...EMPTY_MEMBER })
      setInfo('Library member added')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const issueBook = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/library/issues', {
          memberId: issueForm.memberId,
          bookId: issueForm.bookId,
          issueDate: issueForm.issueDate,
          dueDate: issueForm.dueDate,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-issues'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setIssueOpen(false)
      setIssueForm({ ...EMPTY_ISSUE })
      setInfo('Book issued')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const returnBook = useMutation({
    mutationFn: (id: string) => unwrap(api.post(`/library/issues/${id}/return`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-issues'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setInfo('Book returned')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const memberCandidates = memberForm.memberType === 'student' ? students : staff

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      {info && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">{info}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Library</h1>
          <p className="text-sm text-slate-500">Books, members and issues</p>
        </div>
        <div className="flex gap-2">
          {tab === 'books' && (
            <button
              onClick={() => setBookOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Add Book
            </button>
          )}
          {tab === 'members' && (
            <button
              onClick={() => setMemberOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Add Member
            </button>
          )}
          {tab === 'issues' && (
            <button
              onClick={() => setIssueOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Issue Book
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {(['books', 'members', 'issues'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 font-medium capitalize transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'books' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or author…"
              className={`${inputCls} !w-72`}
            />
          </div>
          {booksQuery.isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : books.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              No books found
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">ISBN</th>
                    <th className="px-4 py-3 font-medium">Copies</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {books.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-indigo-500" />
                          <div>
                            <div className="font-medium text-slate-800">{b.title}</div>
                            <div className="text-xs text-slate-400">{b.publisher ?? ''}{b.shelfLocation ? ` · ${b.shelfLocation}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.author ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{b.category ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{b.isbn ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className={Number(b.availableCopies) === 0 ? 'text-red-600' : ''}>
                          {b.availableCopies}/{b.totalCopies}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={Number(b.availableCopies) === 0 ? 'red' : 'green'}>
                          {Number(b.availableCopies) === 0 ? 'Out of stock' : 'Available'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteBook.mutate(b.id)}
                          className="text-slate-400 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Membership</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{memberName(m.memberId)}</td>
                  <td className="px-4 py-3"><Badge tone={m.memberType === 'student' ? 'indigo' : 'amber'}>{m.memberType}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{m.membershipDate ? String(m.membershipDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{m.expiryDate ? String(m.expiryDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={m.status === 'active' ? 'green' : 'slate'}>{m.status ?? '—'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'issues' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Book</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{bookName(i.bookId)}</td>
                  <td className="px-4 py-3 text-slate-600">{memberName(i.memberId)}</td>
                  <td className="px-4 py-3 text-slate-600">{i.issueDate ? String(i.issueDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{i.dueDate ? String(i.dueDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={i.status === 'returned' ? 'green' : 'amber'}>{i.status ?? '—'}</Badge></td>
                  <td className="px-4 py-3">
                    {i.status !== 'returned' && (
                      <button
                        onClick={() => returnBook.mutate(i.id)}
                        disabled={returnBook.isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Undo2 size={13} /> Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={bookOpen} title="Add Book" onClose={() => setBookOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createBook.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Title" required>
            <input
              required
              value={bookForm.title}
              onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Author">
              <input
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="ISBN">
              <input
                value={bookForm.isbn}
                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Publisher">
              <input
                value={bookForm.publisher}
                onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <input
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Edition">
              <input
                value={bookForm.edition}
                onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Language">
              <input
                value={bookForm.language}
                onChange={(e) => setBookForm({ ...bookForm, language: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Shelf">
              <input
                value={bookForm.shelfLocation}
                onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Copies">
              <input
                type="number"
                min={1}
                value={bookForm.totalCopies}
                onChange={(e) => setBookForm({ ...bookForm, totalCopies: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Available Copies">
              <input
                type="number"
                min={0}
                value={bookForm.availableCopies}
                onChange={(e) => setBookForm({ ...bookForm, availableCopies: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBookOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Add Book
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={memberOpen} title="Add Library Member" onClose={() => setMemberOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createMember.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Member Type" required>
            <div className="flex gap-4">
              {(['student', 'staff'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={memberForm.memberType === t}
                    onChange={() => setMemberForm({ ...memberForm, memberType: t, memberId: '' })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t === 'student' ? 'Student' : 'Staff'}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Person" required>
            <select
              required
              value={memberForm.memberId}
              onChange={(e) => setMemberForm({ ...memberForm, memberId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select {memberForm.memberType}</option>
              {memberCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Membership Date" required>
              <input
                type="date"
                required
                value={memberForm.membershipDate}
                onChange={(e) => setMemberForm({ ...memberForm, membershipDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Expiry Date">
              <input
                type="date"
                value={memberForm.expiryDate}
                onChange={(e) => setMemberForm({ ...memberForm, expiryDate: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMemberOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Add Member
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={issueOpen} title="Issue Book" onClose={() => setIssueOpen(false)} wide>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            issueBook.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Member" required>
              <select
                required
                value={issueForm.memberId}
                onChange={(e) => setIssueForm({ ...issueForm, memberId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.memberId}>
                    {memberName(m.memberId)} ({m.memberType})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Book" required>
              <select
                required
                value={issueForm.bookId}
                onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select book</option>
                {books
                  .filter((b) => Number(b.availableCopies) > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.availableCopies} left)
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue Date" required>
              <input
                type="date"
                required
                value={issueForm.issueDate}
                onChange={(e) => setIssueForm({ ...issueForm, issueDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Due Date" required>
              <input
                type="date"
                required
                value={issueForm.dueDate}
                onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIssueOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Issue Book
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
