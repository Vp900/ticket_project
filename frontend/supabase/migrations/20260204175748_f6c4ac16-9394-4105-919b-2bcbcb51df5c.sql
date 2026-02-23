-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'agent');

-- Create ticket_status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'closed', 'reopened');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile_number TEXT,
    supervisor_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'agent',
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create tickets table
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    mobile_number TEXT,
    status public.ticket_status NOT NULL DEFAULT 'open',
    created_by_agent_id UUID NOT NULL REFERENCES public.profiles(id),
    assigned_agent_id UUID REFERENCES public.profiles(id),
    supervisor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create ticket_status_history table
CREATE TABLE public.ticket_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    old_status public.ticket_status,
    new_status public.ticket_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ticket_status_history
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;

-- Create login_logs table
CREATE TABLE public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address TEXT
);

-- Enable RLS on login_logs
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_profiles_supervisor_id ON public.profiles(supervisor_id);
CREATE INDEX idx_profiles_is_deleted ON public.profiles(is_deleted);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by_agent_id);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_agent_id);
CREATE INDEX idx_tickets_supervisor ON public.tickets(supervisor_id);
CREATE INDEX idx_ticket_history_ticket ON public.ticket_status_history(ticket_id);
CREATE INDEX idx_login_logs_user ON public.login_logs(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Security definer function to get supervisor id
CREATE OR REPLACE FUNCTION public.get_supervisor_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT supervisor_id
    FROM public.profiles
    WHERE id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view their agents"
    ON public.profiles FOR SELECT
    USING (
        public.has_role(auth.uid(), 'supervisor') 
        AND supervisor_id = auth.uid()
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = id);

CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tickets
CREATE POLICY "Agents can view their own tickets"
    ON public.tickets FOR SELECT
    USING (auth.uid() = created_by_agent_id OR auth.uid() = assigned_agent_id);

CREATE POLICY "Supervisors can view their hierarchy tickets"
    ON public.tickets FOR SELECT
    USING (
        public.has_role(auth.uid(), 'supervisor')
        AND supervisor_id = auth.uid()
    );

CREATE POLICY "Admins can view all tickets"
    ON public.tickets FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can create tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid() = created_by_agent_id);

CREATE POLICY "Agents can update their tickets"
    ON public.tickets FOR UPDATE
    USING (auth.uid() = created_by_agent_id OR auth.uid() = assigned_agent_id);

CREATE POLICY "Supervisors can update hierarchy tickets"
    ON public.tickets FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'supervisor')
        AND supervisor_id = auth.uid()
    );

CREATE POLICY "Admins can update all tickets"
    ON public.tickets FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ticket_status_history
CREATE POLICY "Users can view their ticket history"
    ON public.ticket_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_id
            AND (t.created_by_agent_id = auth.uid() OR t.assigned_agent_id = auth.uid())
        )
    );

CREATE POLICY "Admins can view all ticket history"
    ON public.ticket_status_history FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert ticket history"
    ON public.ticket_status_history FOR INSERT
    WITH CHECK (auth.uid() = changed_by);

-- RLS Policies for login_logs
CREATE POLICY "Users can view their own login logs"
    ON public.login_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all login logs"
    ON public.login_logs FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own login logs"
    ON public.login_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role public.app_role;
BEGIN
    -- Get role from metadata or default to agent
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::public.app_role,
        'agent'::public.app_role
    );

    -- Insert profile
    INSERT INTO public.profiles (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email
    );

    -- Insert role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role);

    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();