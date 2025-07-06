
-- Clean migration to fix user signup issues

-- Drop existing objects if they exist (for clean migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;

-- Drop tables if they exist
DROP TABLE IF EXISTS public.in_out_logs CASCADE;
DROP TABLE IF EXISTS public.outpass_requests CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS outpass_status CASCADE;
DROP TYPE IF EXISTS log_type CASCADE;

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'admin', 'guard');

-- Create enum for outpass status
CREATE TYPE outpass_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for log type
CREATE TYPE log_type AS ENUM ('out', 'in');

-- Create profiles table to store user information and roles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  student_id TEXT, -- Only for students
  phone TEXT,
  room_number TEXT, -- Only for students
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outpass_requests table
CREATE TABLE public.outpass_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  destination TEXT NOT NULL,
  from_time TIMESTAMP WITH TIME ZONE NOT NULL,
  to_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status outpass_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  qr_code TEXT, -- Generated QR code data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create in_out_logs table
CREATE TABLE public.in_out_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outpass_id UUID REFERENCES public.outpass_requests(id) ON DELETE SET NULL,
  log_type log_type NOT NULL,
  scanned_by UUID REFERENCES public.profiles(id), -- Guard who scanned
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outpass_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_out_logs ENABLE ROW LEVEL SECURITY;

-- Function to get current user role (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Guards can view student profiles" ON public.profiles
  FOR SELECT USING (
    role = 'student' AND public.get_current_user_role() IN ('guard', 'admin')
  );

-- Outpass requests policies
CREATE POLICY "Students can view their own requests" ON public.outpass_requests
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create their own requests" ON public.outpass_requests
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their pending requests" ON public.outpass_requests
  FOR UPDATE USING (student_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can view all requests" ON public.outpass_requests
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all requests" ON public.outpass_requests
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Guards can view approved requests" ON public.outpass_requests
  FOR SELECT USING (
    status = 'approved' AND public.get_current_user_role() IN ('guard', 'admin')
  );

-- In/Out logs policies
CREATE POLICY "Students can view their own logs" ON public.in_out_logs
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Guards can view and create logs" ON public.in_out_logs
  FOR ALL USING (public.get_current_user_role() IN ('guard', 'admin'));

CREATE POLICY "Admins can view all logs" ON public.in_out_logs
  FOR SELECT USING (public.get_current_user_role() = 'admin');

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'student'::user_role
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outpass_requests_updated_at 
  BEFORE UPDATE ON public.outpass_requests 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
