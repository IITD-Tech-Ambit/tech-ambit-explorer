import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, FileText, Users, Building } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Explore = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = [
    "All",
    "Departments",
    "Centers",
    "Schools",
    "Interdisciplinary",
    "IRD",
    "Industrial MoUs",
  ];

  const researchItems = [
    {
      title: "Artificial Intelligence & Machine Learning Lab",
      category: "Departments",
      department: "Computer Science & Engineering",
      type: "Industrial Research",
      description: "Advanced research in deep learning, neural networks, and AI applications for real-world problems.",
      projects: 45,
      faculty: 12,
      students: 120,
    },
    {
      title: "Sustainable Energy Research Initiative",
      category: "Interdisciplinary",
      department: "Energy Studies",
      type: "IRD Funded",
      description: "Developing next-generation solar cells and renewable energy solutions for sustainable future.",
      projects: 28,
      faculty: 8,
      students: 85,
    },
    {
      title: "Quantum Computing Research Group",
      category: "Centers",
      department: "Physics",
      type: "PostDoc Research",
      description: "Exploring quantum algorithms, quantum cryptography, and quantum information theory.",
      projects: 15,
      faculty: 6,
      students: 40,
    },
    {
      title: "Biotechnology & Biomedical Engineering",
      category: "Schools",
      department: "Biological Sciences",
      type: "PG Thesis",
      description: "Innovative research in drug delivery systems, tissue engineering, and molecular diagnostics.",
      projects: 52,
      faculty: 15,
      students: 150,
    },
    {
      title: "Smart City Technologies Lab",
      category: "Industrial MoUs",
      department: "Civil Engineering",
      type: "Student Research",
      description: "Developing IoT solutions and sustainable infrastructure for future urban environments.",
      projects: 33,
      faculty: 10,
      students: 95,
    },
    {
      title: "Advanced Materials Research Center",
      category: "Centers",
      department: "Materials Science",
      type: "FORS Program",
      description: "Research on nanomaterials, composites, and smart materials for industrial applications.",
      projects: 40,
      faculty: 11,
      students: 110,
    },
  ];

  const filteredItems =
    activeFilter === "All"
      ? researchItems
      : researchItems.filter((item) => item.category === activeFilter);

  return (
    <div className="min-h-screen page-bg">
      <Navigation />

      {/* Header */}
      <section className="gradient-subtle pt-32 pb-16 section-bg">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 animate-fade-in">
            Explore Research
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl animate-slide-up">
            Browse through our comprehensive repository of research projects, departments, 
            centers, and interdisciplinary initiatives at IIT Delhi.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl animate-slide-up">
            
            <Input
              type="text"
              placeholder="Search by department, project, faculty, or keywords..."
              className="pl-12 h-12 text-base search-input"
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Filter by:</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              onClick={() => setActiveFilter(filter)}
              className="rounded-full"
            >
              {filter}
            </Button>
          ))}
        </div>
      </section>

      {/* Research Items Grid */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredItems.map((item, index) => (
            <Card
              key={index}
              className="hover:shadow-elegant transition-smooth cursor-pointer border-border"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{item.category}</Badge>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <CardTitle className="text-xl mb-2">{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.department}</p>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{item.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{item.projects} Projects</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{item.faculty} Faculty</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Building className="h-4 w-4" />
                      <span>{item.students} Students</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Explore;
