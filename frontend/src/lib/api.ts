const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'x-auth-token': token } : {})
    };
};

export const api = {
    // Auth
    login: async (credentials: any) => {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }
        return response.json();
    },

    register: async (userData: any) => {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }
        return response.json();
    },

    // Users
    fetchUsers: async (search: string = '') => {
        const response = await fetch(`${API_BASE_URL}/users?search=${search}`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    updateUser: async (id: string, userData: any) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(userData),
        });
        if (!response.ok) throw new Error('Failed to update user');
        return response.json();
    },

    deleteUser: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return response.json();
    },

    updateProfile: async (profileData: any) => {
        const response = await fetch(`${API_BASE_URL}/users/profile/update`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(profileData),
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
    },

    // Tickets
    fetchTickets: async (filters: any = {}) => {
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) queryParams.append(key, filters[key]);
        });

        const response = await fetch(`${API_BASE_URL}/tickets?${queryParams.toString()}`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch tickets');
        return response.json();
    },

    createTicket: async (ticketData: any) => {
        const response = await fetch(`${API_BASE_URL}/tickets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(ticketData),
        });
        if (!response.ok) throw new Error('Failed to create ticket');
        return response.json();
    },

    updateTicketStatus: async (id: string, status: string) => {
        const response = await fetch(`${API_BASE_URL}/tickets/${id}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error('Failed to update ticket status');
        return response.json();
    },

    editTicket: async (id: string, ticketData: any) => {
        const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(ticketData),
        });
        if (!response.ok) throw new Error('Failed to edit ticket');
        return response.json();
    },

    // Stats
    fetchStats: async () => {
        const response = await fetch(`${API_BASE_URL}/stats`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    }
};
