import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, ExternalLink } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Directory = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Faculty", "Research Labs", "Research Groups", "Centers"];

  const directoryEntries = [
    {
      name: "Dr. Anika Sharma",
      role: "Professor",
      department: "Computer Science & Engineering",
      specialization: "Artificial Intelligence, Machine Learning",
      email: "anika.sharma@iitd.ac.in",
      type: "Faculty",
      image: "👩‍🔬",
    },
    {
      name: "Dr. Rajesh Kumar",
      role: "Associate Professor",
      department: "Electrical Engineering",
      specialization: "Power Systems, Renewable Energy",
      email: "rajesh.kumar@iitd.ac.in",
      type: "Faculty",
      image: "👨‍🔬",
    },
    {
      name: "AI & Robotics Lab",
      role: "Research Laboratory",
      department: "Computer Science & Engineering",
      specialization: "Autonomous Systems, Computer Vision",
      email: "ai-lab@iitd.ac.in",
      type: "Research Labs",
      image: "🤖",
    },
    {
      name: "Dr. Priya Malhotra",
      role: "Assistant Professor",
      department: "Biotechnology",
      specialization: "Molecular Biology, Genetic Engineering",
      email: "priya.malhotra@iitd.ac.in",
      type: "Faculty",
      image: "👩‍🔬",
    },
    {
      name: "Quantum Research Group",
      role: "Research Group",
      department: "Physics",
      specialization: "Quantum Computing, Quantum Information",
      email: "quantum@iitd.ac.in",
      type: "Research Groups",
      image: "⚛️",
    },
    {
      name: "Dr. Vikram Singh",
      role: "Professor",
      department: "Mechanical Engineering",
      specialization: "Thermodynamics, Energy Systems",
      email: "vikram.singh@iitd.ac.in",
      type: "Faculty",
      image: "👨‍🔬",
    },
    {
      name: "Sustainable Energy Center",
      role: "Research Center",
      department: "Energy Studies",
      specialization: "Solar Energy, Wind Power, Energy Storage",
      email: "sec@iitd.ac.in",
      type: "Centers",
      image: "🌞",
    },
    {
      name: "Dr. Meera Desai",
      role: "Associate Professor",
      department: "Civil Engineering",
      specialization: "Structural Engineering, Smart Cities",
      email: "meera.desai@iitd.ac.in",
      type: "Faculty",
      image: "👩‍🔬",
    },
  ];

  const filteredEntries =
    activeFilter === "All"
      ? directoryEntries
      : directoryEntries.filter((entry) => entry.type === activeFilter);

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Header */}
      <section className="gradient-subtle pt-32 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 animate-fade-in">
            Who We Are
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl animate-slide-up">
            Connect with our distinguished faculty, research labs, and innovative 
            research groups driving cutting-edge discoveries at IIT Delhi.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl animate-slide-up">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, department, or research area..."
              className="pl-12 h-12 text-base"
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-8">
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

      {/* Directory Grid */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry, index) => (
            <Card
              key={index}
              className="hover:shadow-elegant transition-smooth cursor-pointer border-border"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-4xl">
                    {entry.image}
                  </div>
                  <Badge variant="secondary">{entry.type}</Badge>
                </div>

                <h3 className="text-xl font-semibold mb-1">{entry.name}</h3>
                <p className="text-sm text-primary font-medium mb-2">{entry.role}</p>
                <p className="text-sm text-muted-foreground mb-3">{entry.department}</p>
                <p className="text-sm mb-4 line-clamp-2">{entry.specialization}</p>

                <div className="flex items-center space-x-2 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
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

export default Directory;
