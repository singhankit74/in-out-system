
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Users, FileText, Activity } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type OutpassRequest = Database['public']['Tables']['outpass_requests']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<OutpassRequest[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchRequests();
      fetchStats();
    }
  }, [profile]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('outpass_requests')
      .select(`
        *,
        profiles!student_id (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch outpass requests",
      });
    } else {
      setRequests(data as OutpassRequest[]);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    // Fetch total requests
    const { count: totalRequests } = await supabase
      .from('outpass_requests')
      .select('*', { count: 'exact', head: true });

    // Fetch pending requests
    const { count: pendingRequests } = await supabase
      .from('outpass_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Fetch approved requests
    const { count: approvedRequests } = await supabase
      .from('outpass_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    // Fetch total students
    const { count: totalStudents } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    setStats({
      totalRequests: totalRequests || 0,
      pendingRequests: pendingRequests || 0,
      approvedRequests: approvedRequests || 0,
      totalStudents: totalStudents || 0,
    });
  };

  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('outpass_requests')
      .update({
        status,
        approved_by: status === 'approved' ? profile?.id : null,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', requestId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update request status",
      });
    } else {
      toast({
        title: "Success",
        description: `Request ${status} successfully`,
      });
      fetchRequests();
      fetchStats();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <Layout title="Access Denied">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvedRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Management */}
        <Card>
          <CardHeader>
            <CardTitle>Outpass Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No outpass requests found</div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{request.profiles?.full_name}</h3>
                          {getStatusBadge(request.status || 'pending')}
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Destination:</strong> {request.destination}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Time:</strong> {new Date(request.from_time).toLocaleString()} - {new Date(request.to_time).toLocaleString()}
                        </p>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateRequestStatus(request.id, 'approved')}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
