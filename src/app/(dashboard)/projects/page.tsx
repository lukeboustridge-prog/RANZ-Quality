"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar,
  Star,
  Camera,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROJECT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  NZ_REGIONS,
  type ProjectType,
  type ProjectStatus,
} from "@/types";

interface Project {
  id: string;
  projectNumber: string;
  clientName: string;
  siteAddress: string;
  city: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  startDate: string;
  completionDate: string | null;
  rating: number | null;
  _count: {
    photos: number;
    documents: number;
  };
  testimonial: {
    rating: number;
    verified: boolean;
  } | null;
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
}

const statusColors: Record<ProjectStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // New project form state
  const [newProject, setNewProject] = useState({
    clientName: "",
    clientEmail: "",
    siteAddress: "",
    city: "",
    region: "",
    projectType: "NEW_BUILD" as ProjectType,
    startDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "20");

      const response = await fetch(`/api/projects?${params}`);
      if (response.ok) {
        const data: ProjectsResponse = await response.json();
        setProjects(data.projects);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        setShowNewDialog(false);
        setNewProject({
          clientName: "",
          clientEmail: "",
          siteAddress: "",
          city: "",
          region: "",
          projectType: "NEW_BUILD",
          startDate: new Date().toISOString().split("T")[0],
          description: "",
        });
        fetchProjects();
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.siteAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500">
            Track your roofing projects and build your portfolio
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={newProject.clientName}
                  onChange={(e) =>
                    setNewProject({ ...newProject, clientName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={newProject.clientEmail}
                  onChange={(e) =>
                    setNewProject({ ...newProject, clientEmail: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="siteAddress">Site Address *</Label>
                <Input
                  id="siteAddress"
                  value={newProject.siteAddress}
                  onChange={(e) =>
                    setNewProject({ ...newProject, siteAddress: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newProject.city}
                    onChange={(e) =>
                      setNewProject({ ...newProject, city: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Select
                    value={newProject.region}
                    onValueChange={(v) =>
                      setNewProject({ ...newProject, region: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {NZ_REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectType">Project Type *</Label>
                  <Select
                    value={newProject.projectType}
                    onValueChange={(v) =>
                      setNewProject({
                        ...newProject,
                        projectType: v as ProjectType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) =>
                      setNewProject({ ...newProject, startDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Projects</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="text-2xl font-bold">
              {projects.filter((p) => p.status === "IN_PROGRESS").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold">
              {projects.filter((p) => p.status === "COMPLETED").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">With Testimonials</p>
            <p className="text-2xl font-bold">
              {projects.filter((p) => p.testimonial?.verified).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ProjectStatus | "")}
        >
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No projects found
            </h3>
            <p className="text-slate-600 mb-4">
              Start tracking your roofing projects to build your portfolio.
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-slate-500">
                          {project.projectNumber}
                        </span>
                        <Badge className={statusColors[project.status]}>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                        <Badge variant="outline">
                          {PROJECT_TYPE_LABELS[project.projectType]}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {project.clientName}
                      </h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {project.siteAddress}
                          {project.city && `, ${project.city}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(project.startDate).toLocaleDateString("en-NZ")}
                        </span>
                        {project._count.photos > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="h-4 w-4" />
                            {project._count.photos} photos
                          </span>
                        )}
                        {project._count.documents > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {project._count.documents} docs
                          </span>
                        )}
                        {project.testimonial?.verified && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-4 w-4 fill-amber-400" />
                            {project.testimonial.rating}/5
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
