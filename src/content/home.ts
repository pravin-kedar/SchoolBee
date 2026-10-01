import type { LucideIcon } from 'lucide-react'
import {
  Award,
  CalendarCheck,
  ChartColumnIncreasing,
  FileText,
  GraduationCap,
  IdCard,
  Star,
  UserPlus,
  Users,
} from 'lucide-react'

import screenStudents from '../assets/screens/students.webp'
import screenProfile from '../assets/screens/profile.webp'
import screenAttendance from '../assets/screens/attendance.webp'
import screenReport from '../assets/screens/report-card.webp'
import screenCertificate from '../assets/screens/certificate.webp'

/** Tailwind classes for each pastel tone used on cards/icons in the mockup. */
export const tones = {
  blue: { card: 'bg-sky-50 border-sky-100', icon: 'bg-sky-100 text-sky-600' },
  pink: { card: 'bg-rose-50 border-rose-100', icon: 'bg-rose-100 text-rose-500' },
  green: { card: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600' },
  yellow: { card: 'bg-amber-50 border-amber-100', icon: 'bg-amber-100 text-amber-500' },
  purple: { card: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600' },
} as const
export type Tone = keyof typeof tones

export type Feature = { icon: LucideIcon; title: string; text: string; tone: Tone }

export const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Screenshots', href: '#screenshots' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQs', href: '#faqs' },
]

export const highlights: Feature[] = [
  { icon: Users, title: 'Student Management', text: 'Easy enrollment and complete student records.', tone: 'blue' },
  { icon: FileText, title: 'Document Management', text: 'Store and manage all important documents.', tone: 'pink' },
  { icon: CalendarCheck, title: 'Attendance Tracking', text: 'Simple and fast attendance tracking.', tone: 'green' },
  { icon: Star, title: 'Preschool Assessments', text: 'Track child development with ease.', tone: 'yellow' },
  { icon: Award, title: 'Certificate Generator', text: 'Create professional certificates and ID cards.', tone: 'blue' },
  { icon: ChartColumnIncreasing, title: 'Reports & Insights', text: 'Useful reports for better insights.', tone: 'purple' },
]

export const designedForPoints = [
  'Simple and clean interface',
  'Quick setup',
  'Works on desktop, tablet and mobile',
  'No technical knowledge required',
]

export const features: Feature[] = [
  { icon: UserPlus, title: 'Student Enrollment', text: 'Add and manage student profiles with parent details, photos and more.', tone: 'blue' },
  { icon: FileText, title: 'Document Management', text: 'Store birth certificates, Aadhaar, photos, medical records and other important documents.', tone: 'pink' },
  { icon: CalendarCheck, title: 'Attendance Tracking', text: 'Take daily attendance and track monthly records with ease.', tone: 'green' },
  { icon: Star, title: 'Preschool Assessments', text: 'Track child development with simple, age-appropriate assessment criteria.', tone: 'yellow' },
  { icon: Award, title: 'Certificate Generator', text: 'Create bonafide, transfer, character, participation certificates and more.', tone: 'purple' },
  { icon: IdCard, title: 'ID Card Generator', text: 'Generate beautiful student ID cards in bulk with custom templates.', tone: 'yellow' },
  { icon: GraduationCap, title: 'Class & Section Management', text: 'Create classes (Play Group, Nursery, LKG, UKG) and manage sections.', tone: 'purple' },
  { icon: ChartColumnIncreasing, title: 'Reports & Export', text: 'View reports and export data to Excel/CSV anytime.', tone: 'blue' },
]

export const steps = [
  { title: 'Create Your Account', text: 'Sign up and create your school.', color: 'bg-violet-500' },
  { title: 'Setup Classes', text: 'Create academic year, classes and sections.', color: 'bg-sky-500' },
  { title: 'Add Students', text: 'Enroll students and upload documents.', color: 'bg-emerald-500' },
  { title: 'Take Attendance', text: 'Track daily attendance with ease.', color: 'bg-orange-500' },
  { title: 'Generate Reports', text: 'Create certificates and view reports anytime.', color: 'bg-rose-500' },
]

export const screenshots = [
  { src: screenStudents, label: 'Student Management' },
  { src: screenProfile, label: 'Student Profile' },
  { src: screenAttendance, label: 'Attendance' },
  { src: screenReport, label: 'Progress Report' },
  { src: screenCertificate, label: 'Certificate Generator' },
]

export type Plan = {
  name: string
  tagline: string
  price: string
  period: string
  perks: string[]
  cta: string
  popular?: boolean
}

/** Shown until the live plans load (GET /plans - edited by us in /zap). */
export const plans: Plan[] = [
  {
    name: 'Free Trial',
    tagline: 'Try everything in SchoolBee free.',
    price: '0',
    period: 'for 30 days',
    perks: ['All features included', 'No card needed', 'Choose a plan any time'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Standard',
    tagline: 'For growing preschools.',
    price: '499',
    period: '/ month',
    perks: ['Up to 200 students', '10 GB document storage', '15 staff logins', 'Advanced reports'],
    cta: 'Choose Standard',
    popular: true,
  },
  {
    name: 'Premium',
    tagline: 'Everything, with no limits.',
    price: '999',
    period: '/ month',
    perks: ['Unlimited students', '50 GB document storage', 'Unlimited staff logins', 'Every feature, incl. AI Assistance'],
    cta: 'Choose Premium',
  },
]

export const testimonials = [
  {
    quote: 'SchoolBee has made it so easy for us to manage all our student records and documents. It’s simple and works perfectly for our preschool.',
    name: 'Priya Deshmukh',
    school: 'Little Stars Preschool, Pune',
    avatar: 'bg-rose-100 text-rose-600',
  },
  {
    quote: 'The certificate generator and attendance features save us so much time. Highly recommended for small schools.',
    name: 'Rohit Mehta',
    school: 'Sunshine Kids, Mumbai',
    avatar: 'bg-sky-100 text-sky-600',
  },
  {
    quote: 'Very easy to use and the interface is beautiful. Our teachers quickly learned and started using it.',
    name: 'Sneha Kulkarni',
    school: 'Happy Kids Preschool, Nashik',
    avatar: 'bg-amber-100 text-amber-600',
  },
]

export const faqs = [
  {
    q: 'Can I try SchoolBee for free?',
    a: 'Yes! Every new school gets a free trial with all features. Choose a plan whenever you are ready — pay online by UPI, card or net banking.',
  },
  {
    q: 'Can I access it on mobile?',
    a: 'Yes. SchoolBee works on desktop, tablet and mobile browsers.',
  },
  {
    q: 'Do I need technical knowledge to use it?',
    a: 'No. SchoolBee is designed to be simple and easy to use for school administrators, teachers and staff.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. We use secure cloud infrastructure and regular backups to keep your data safe.',
  },
]
