"use client"
import { useState } from "react";
import toast from "react-hot-toast";



const ManufactureCard = ({title,description,fields,onSubmit}) => {
     const [isOpen,setIsOpen] = useState(false);
     const [values,setValues] = useState({});
     const [isSubmitting,setIsSubmitting] = useState(false);


     const handleChange = (name,value)=>{
          setValues((prev)=>({...prev,[name]:value}));
     }

     const handleSubmit = async(e)=>{
          e.preventDefault();
          setIsSubmitting(true);
          const toastId = toast.loading("confirm transaction in wallet")
          try {
               await onSubmit(values);
               toast.success("transaction Confirmed",{id:toastId});
               setValues({});
               setIsOpen(false);
          } catch (err) {
               console.log(err);
               toast.error(err?.reason || err?.message || "Transaction failed.", { id: toastId });          
          }finally{
               setIsSubmitting(false);
          } 
          }



  return (
    <div className="rounded-lg border border-[#4A5D48] bg-[#243329]">
     <button
     onClick={()=>setIsOpen((prev)=>!prev)}
     className="flex w-full items-center justify-between px-5 py-4 text-left"

     >
          <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-sm text-white/60">{description}</p>
          </div>
          <span className="text-[#8FA88A]">
          {isOpen ? "-" : "+"}
          </span>
     </button>
     {isOpen && (
          <form onSubmit={handleSubmit}  className="border-t border-[#4A5D48] px-5 py-4 space-y-3">
               {fields.map((field)=>(
                    <input 
                    key={field.name}
                    type = {field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={values[field.name] || ""}
                    onChange={(e)=>handleChange(field.name,e.target.value)}
                    required
                    className="w-full rounded-md border border-[#4A5D48] bg-[#1C2620] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#8FA88A]"
                    />
               ))}
               <button
               type="submit"
               disabled={isSubmitting}
               className="w-full rounded-md bg-[#8FA88A] px-4 py-2 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50"
               >
                    {isSubmitting ? "Processing.." : "Submit"}

               </button>
          </form>
     )}
    </div>
  )
}

export default ManufactureCard